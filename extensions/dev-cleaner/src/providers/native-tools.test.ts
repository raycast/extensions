import { chmod, mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/command", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/command")>()),
  resolveExecutable: (await import("../test-support/command")).resolveFromExtraPath,
}));

import { NativeToolsProvider } from "./native-tools";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("native tools provider", () => {
  it("discovers installed tools and stale npx workspaces", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-native-"));
    temporaryDirectories.push(home);
    const bin = path.join(home, "bin");
    await mkdir(bin);
    for (const tool of ["npm", "pnpm", "uv", "brew", "docker"]) {
      const executable = path.join(bin, tool);
      const output =
        tool === "pnpm"
          ? `if [ "$1" = "store" ] && [ "$2" = "path" ]; then echo "${path.join(home, "pnpm-store/v11")}"; else echo pnpm-ok; fi`
          : `echo ${tool}-ok`;
      await writeFile(executable, `#!/bin/sh\n${output}\n`);
      await chmod(executable, 0o755);
    }
    const npx = path.join(home, ".npm/_npx/old-workspace");
    await mkdir(npx, { recursive: true });
    await writeFile(path.join(npx, "package.json"), "{}");
    const old = new Date("2026-07-01T00:00:00Z");
    await utimes(npx, old, old);
    await writeFile(path.join(home, ".npm/_npx/stray-file"), "not a workspace");
    const recent = path.join(home, ".npm/_npx/recent-workspace");
    await mkdir(recent);
    const recentDate = new Date("2026-09-20T00:00:00Z");
    await utimes(recent, recentDate, recentDate);
    await mkdir(path.join(home, ".npm/_cacache"), { recursive: true });
    await writeFile(path.join(home, ".npm/_cacache/item"), "cache");
    await mkdir(path.join(home, "pnpm-store/v11"), { recursive: true });
    await writeFile(path.join(home, "pnpm-store/v11/item"), "cache");

    const result = await new NativeToolsProvider().scan({
      homeDirectory: home,
      projectRoots: [],
      extraPath: bin,
      now: new Date("2026-09-24T00:00:00Z"),
    });

    expect(result.issues).toEqual([]);
    expect(result.candidates).toHaveLength(7);
    expect(result.candidates.filter((candidate) => candidate.id.startsWith("npm:npx:"))).toHaveLength(1);
    expect(result.candidates.find((candidate) => candidate.id === "npm:npx:old-workspace")).toMatchObject({
      cleanupPolicy: "trash",
      selectedByDefault: true,
    });
    expect(result.candidates.find((candidate) => candidate.providerId === "homebrew")?.description).toContain(
      "Preview:",
    );
    expect(result.candidates.filter((candidate) => candidate.providerId === "docker")).toHaveLength(2);
    expect(result.candidates.find((candidate) => candidate.providerId === "pnpm")?.path).toBe(
      path.join(home, "pnpm-store/v11"),
    );
    expect(
      result.candidates
        .filter((candidate) => candidate.cleanupPolicy === "command")
        .every((candidate) => !candidate.selectedByDefault),
    ).toBe(true);
  });

  it("isolates npx, pnpm, and Homebrew inspection failures", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-native-errors-"));
    temporaryDirectories.push(home);
    const bin = path.join(home, "bin");
    await mkdir(bin);
    await writeFile(path.join(home, ".npm"), "not a directory");
    await writeFile(path.join(bin, "pnpm"), "#!/bin/sh\nexit 1\n");
    await writeFile(path.join(bin, "brew"), "#!/bin/sh\nexit 1\n");
    await chmod(path.join(bin, "pnpm"), 0o755);
    await chmod(path.join(bin, "brew"), 0o755);

    const result = await new NativeToolsProvider().scan({ homeDirectory: home, projectRoots: [], extraPath: bin });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: "npm", message: expect.stringContaining("npx cache") }),
        expect.objectContaining({ providerId: "pnpm" }),
        expect.objectContaining({ providerId: "homebrew", message: expect.stringContaining("Preview failed") }),
      ]),
    );
    expect(result.candidates.some((candidate) => candidate.providerId === "pnpm")).toBe(false);
  });

  it("returns nothing when no tools or npx workspaces exist", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-native-empty-"));
    temporaryDirectories.push(home);
    await expect(new NativeToolsProvider().scan({ homeDirectory: home, projectRoots: [] })).resolves.toEqual({
      candidates: [],
      issues: [],
    });
  });
});
