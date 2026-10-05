import { access, chmod, mkdir, mkdtemp, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { trash } = vi.hoisted(() => ({
  trash: vi.fn<(target: string) => Promise<void>>().mockResolvedValue(undefined),
}));
vi.mock("@raycast/api", () => ({ trash }));

import { cleanCandidate, cleanCandidates, freshRetryTargets } from "./cleanup";
import type { CleanupCandidate } from "./types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  trash.mockClear();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("cleanup orchestration", () => {
  it("validates and moves project artifacts to Trash", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-cleanup-"));
    temporaryDirectories.push(home);
    const root = path.join(home, "projects");
    const artifact = path.join(root, "app/node_modules");
    await mkdir(artifact, { recursive: true });
    const candidate: CleanupCandidate = {
      id: "project:test",
      providerId: "projects",
      section: "Project Artifacts",
      title: "node_modules",
      subtitle: artifact,
      description: "test",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      path: artifact,
      bytes: 12,
    };

    await expect(cleanCandidate(candidate, { homeDirectory: home, projectRoots: [root] })).resolves.toMatchObject({
      status: "cleaned",
      bytes: 12,
    });
    expect(trash).toHaveBeenCalledWith(artifact);
  });

  it("reports unsafe paths and missing command specifications", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-cleanup-"));
    temporaryDirectories.push(home);
    const base: CleanupCandidate = {
      id: "bad",
      providerId: "projects",
      section: "Project Artifacts",
      title: "bad",
      subtitle: "bad",
      description: "test",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      path: home,
    };
    expect((await cleanCandidate(base, { homeDirectory: home, projectRoots: [] })).status).toBe("failed");
    expect(
      (
        await cleanCandidate(
          { ...base, id: "command", cleanupPolicy: "command", path: undefined },
          { homeDirectory: home, projectRoots: [] },
        )
      ).message,
    ).toContain("Missing command");
    await expect(
      cleanCandidate({ ...base, id: "pathless", path: undefined }, { homeDirectory: home, projectRoots: [] }),
    ).resolves.toMatchObject({ status: "failed", message: "Missing cleanup path" });
    expect(trash).not.toHaveBeenCalled();
  });

  it("refuses kept items before running a command or moving a path to Trash", async () => {
    const base: CleanupCandidate = {
      id: "kept",
      providerId: "npm",
      section: "test",
      title: "Kept item",
      subtitle: "test",
      description: "test",
      cleanupPolicy: "trash",
      risk: "safe",
      selectedByDefault: true,
      path: "/tmp/kept",
    };
    const context = {
      homeDirectory: os.tmpdir(),
      projectRoots: [],
      excludedCandidateIds: new Set([base.id]),
    };
    const results = await cleanCandidates(
      [base, { ...base, cleanupPolicy: "command", command: { executable: "/bin/echo", args: ["deleted"] } }],
      context,
    );
    expect(results).toEqual([
      expect.objectContaining({ status: "failed", message: expect.stringContaining("kept out of cleanup") }),
      expect.objectContaining({ status: "failed", message: expect.stringContaining("kept out of cleanup") }),
    ]);
    expect(trash).not.toHaveBeenCalled();
  });

  it("allows runtime caches only inside their managed roots", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-runtime-cleanup-"));
    temporaryDirectories.push(home);
    const versionsRoot = path.join(home, ".local/share/fnm/node-versions");
    for (const version of ["v18.20.0", "v22.16.0", "v24.18.0"]) {
      await mkdir(path.join(versionsRoot, version, "installation"), { recursive: true });
    }
    await mkdir(path.join(home, ".local/share/fnm/aliases"), { recursive: true });
    await symlink(
      path.join(versionsRoot, "v24.18.0/installation"),
      path.join(home, ".local/share/fnm/aliases/default"),
    );
    const nodeVersion = path.join(versionsRoot, "v18.20.0");
    const candidate: CleanupCandidate = {
      id: "node:v18",
      providerId: "node",
      section: "Runtime Versions",
      title: "Node.js v18",
      subtitle: nodeVersion,
      description: "test",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      path: nodeVersion,
    };
    expect((await cleanCandidate(candidate, { homeDirectory: home, projectRoots: [] })).status).toBe("cleaned");
    expect(trash).toHaveBeenCalledWith(nodeVersion);
  });

  it("refuses a Node.js version that became the fnm default after scanning", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-runtime-default-"));
    temporaryDirectories.push(home);
    const versionsRoot = path.join(home, ".local/share/fnm/node-versions");
    for (const version of ["v16.20.0", "v18.20.0", "v22.16.0", "v24.18.0"]) {
      await mkdir(path.join(versionsRoot, version, "installation"), { recursive: true });
    }
    await mkdir(path.join(home, ".local/share/fnm/aliases"), { recursive: true });
    await symlink(
      path.join(versionsRoot, "v16.20.0/installation"),
      path.join(home, ".local/share/fnm/aliases/default"),
    );
    const nodeVersion = path.join(versionsRoot, "v16.20.0");
    const candidate: CleanupCandidate = {
      id: `node:runtime:${nodeVersion}`,
      providerId: "node",
      section: "Runtime Versions",
      title: "Node.js v16.20.0",
      subtitle: nodeVersion,
      description: "test",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      path: nodeVersion,
    };

    await expect(cleanCandidate(candidate, { homeDirectory: home, projectRoots: [] })).resolves.toMatchObject({
      status: "failed",
      message: expect.stringContaining("Default fnm version"),
    });
    expect(trash).not.toHaveBeenCalled();
  });

  it("refuses a Rust toolchain that became active after scanning", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-runtime-rust-"));
    temporaryDirectories.push(home);
    const bin = path.join(home, "bin");
    await mkdir(bin);
    const marker = path.join(home, "uninstalled");
    await writeFile(
      path.join(bin, "rustup"),
      `#!/bin/sh\nif [ "$1" = "show" ]; then echo "nightly-aarch64-apple-darwin (overridden)"; elif [ "$1" = "toolchain" ] && [ "$2" = "list" ]; then echo "stable-aarch64-apple-darwin (default)"; echo "nightly-aarch64-apple-darwin (active)"; elif [ "$1" = "toolchain" ]; then touch "${marker}"; fi\n`,
    );
    await chmod(path.join(bin, "rustup"), 0o755);
    const candidate: CleanupCandidate = {
      id: "rustup:toolchain:nightly-aarch64-apple-darwin",
      providerId: "rustup",
      section: "Runtime Versions",
      title: "Rust nightly-aarch64-apple-darwin",
      subtitle: "rustup toolchain uninstall nightly-aarch64-apple-darwin",
      description: "test",
      cleanupPolicy: "command",
      risk: "review",
      selectedByDefault: false,
      command: {
        executable: path.join(bin, "rustup"),
        args: ["toolchain", "uninstall", "nightly-aarch64-apple-darwin"],
      },
    };

    await expect(
      cleanCandidate(candidate, { homeDirectory: home, projectRoots: [], extraPath: bin }),
    ).resolves.toMatchObject({ status: "failed", message: expect.stringContaining("Active toolchain") });
    await expect(access(marker)).rejects.toThrow();
  });

  it("runs commands sequentially and reports progress", async () => {
    const progress: string[] = [];
    const candidate = (id: string): CleanupCandidate => ({
      id,
      providerId: "npm",
      section: "Package Managers",
      title: id,
      subtitle: id,
      description: "test",
      cleanupPolicy: "command",
      risk: "safe",
      selectedByDefault: true,
      command: { executable: "/bin/echo", args: [id] },
    });
    const results = await cleanCandidates(
      [candidate("one"), candidate("two")],
      { homeDirectory: os.tmpdir(), projectRoots: [] },
      (completed, total) => progress.push(`${completed}/${total}`),
    );
    expect(results.map((result) => result.status)).toEqual(["cleaned", "cleaned"]);
    expect(progress).toEqual(["1/2", "2/2"]);
  });

  it("refuses a trash item that changed after scanning", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-revalidate-"));
    temporaryDirectories.push(home);
    const root = path.join(home, "projects");
    const artifact = path.join(root, "app/build");
    await mkdir(artifact, { recursive: true });
    const scannedAt = new Date("2026-01-01T00:00:00Z");
    await utimes(artifact, scannedAt, scannedAt);
    const candidate: CleanupCandidate = {
      id: "changed",
      providerId: "projects",
      section: "Project Artifacts",
      title: "build",
      subtitle: artifact,
      description: "test",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      path: artifact,
      modifiedAt: scannedAt,
    };
    await utimes(artifact, new Date("2026-02-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"));

    await expect(cleanCandidate(candidate, { homeDirectory: home, projectRoots: [root] })).resolves.toMatchObject({
      status: "failed",
      message: expect.stringContaining("changed since the scan"),
    });
    expect(trash).not.toHaveBeenCalled();
  });

  it("marks remaining items cancelled without executing them", async () => {
    const controller = new AbortController();
    controller.abort();
    const candidate: CleanupCandidate = {
      id: "cancelled",
      providerId: "npm",
      section: "Packages",
      title: "cancelled",
      subtitle: "cancelled",
      description: "test",
      cleanupPolicy: "command",
      risk: "safe",
      selectedByDefault: false,
      command: { executable: "/bin/echo", args: ["should-not-run"] },
    };
    await expect(
      cleanCandidates([candidate], { homeDirectory: os.tmpdir(), projectRoots: [], signal: controller.signal }),
    ).resolves.toEqual([expect.objectContaining({ candidateId: "cancelled", status: "cancelled" })]);
  });

  it("accepts each managed cache root and records zero immediate reclaim for Trash", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-managed-roots-"));
    temporaryDirectories.push(home);
    const cases: Array<{ providerId: CleanupCandidate["providerId"]; relativePath: string }> = [
      { providerId: "xcode", relativePath: "Library/Developer/Xcode/DerivedData/App" },
      { providerId: "simulator", relativePath: "Library/Developer/CoreSimulator/Caches" },
      { providerId: "cocoapods", relativePath: "Library/Caches/CocoaPods" },
      { providerId: "swiftpm", relativePath: "Library/Caches/org.swift.swiftpm" },
      { providerId: "npm", relativePath: ".npm/_npx/workspace" },
      { providerId: "pnpm", relativePath: "Library/pnpm/store/v11" },
      { providerId: "cargo", relativePath: ".cargo/registry" },
      { providerId: "gradle", relativePath: ".gradle/caches" },
      { providerId: "android", relativePath: ".android/cache" },
      { providerId: "claude", relativePath: ".cache/claude/staging/old" },
      { providerId: "codex", relativePath: ".codex/.tmp/old" },
    ];
    for (const item of cases) {
      const target = path.join(home, item.relativePath);
      await mkdir(target, { recursive: true });
      const result = await cleanCandidate(
        {
          id: `${item.providerId}:${item.relativePath}`,
          providerId: item.providerId,
          section: "test",
          title: path.basename(target),
          subtitle: target,
          description: "test",
          cleanupPolicy: "trash",
          risk: "review",
          selectedByDefault: false,
          path: target,
        },
        { homeDirectory: home, projectRoots: [] },
      );
      expect(result).toMatchObject({ status: "cleaned", bytesReclaimed: 0 });
    }
  });

  it("captures command failures and cancellation", async () => {
    const failed: CleanupCandidate = {
      id: "failed-command",
      providerId: "npm",
      section: "test",
      title: "failed",
      subtitle: "failed",
      description: "test",
      cleanupPolicy: "command",
      risk: "safe",
      selectedByDefault: false,
      command: { executable: "/bin/sh", args: ["-c", "exit 3"] },
    };
    await expect(cleanCandidate(failed, { homeDirectory: os.tmpdir(), projectRoots: [] })).resolves.toMatchObject({
      status: "failed",
    });

    const controller = new AbortController();
    controller.abort();
    await expect(
      cleanCandidate(failed, { homeDirectory: os.tmpdir(), projectRoots: [], signal: controller.signal }),
    ).resolves.toMatchObject({ status: "cancelled" });
  });
});

describe("retry targets", () => {
  const fresh: CleanupCandidate = {
    id: "project:build",
    providerId: "projects",
    section: "Project Artifacts",
    title: "build",
    subtitle: "/tmp/build",
    description: "test",
    cleanupPolicy: "trash",
    risk: "review",
    selectedByDefault: false,
    path: "/tmp/build",
    modifiedAt: new Date("2026-02-01T00:00:00Z"),
  };

  it("waits for the refresh scan before retrying", () => {
    expect(freshRetryTargets(new Set([fresh.id]), undefined)).toEqual({ status: "scanning" });
  });

  it("uses the rescanned candidate for failed items", () => {
    expect(freshRetryTargets(new Set([fresh.id]), [fresh])).toEqual({ status: "ready", candidates: [fresh] });
  });

  it("reports failed items that no longer appear in the scan", () => {
    expect(freshRetryTargets(new Set([fresh.id]), [])).toEqual({ status: "missing" });
  });
});
