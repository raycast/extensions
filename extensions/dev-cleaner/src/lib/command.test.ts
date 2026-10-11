import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveExecutable, runCommand } from "./command";

const temporaryDirectories: string[] = [];

async function waitForPid(file: string): Promise<number> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const contents = await readFile(file, "utf8").catch(() => "");
    if (contents.trim()) return Number(contents.trim());
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`No pid written to ${file}`);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("command helpers", () => {
  it("prefers an explicit additional PATH", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-command-"));
    temporaryDirectories.push(home);
    const bin = path.join(home, "bin");
    await mkdir(bin);
    const executable = path.join(bin, "cleaner-test");
    await writeFile(executable, "#!/bin/sh\necho ok\n");
    await chmod(executable, 0o755);

    expect(await resolveExecutable("cleaner-test", { homeDirectory: home, extraPath: bin })).toBe(executable);
    expect(await resolveExecutable("does-not-exist-cleaner", { homeDirectory: home, extraPath: bin })).toBeUndefined();
  });

  it("finds tools in fnm-managed Node installations, newest version first", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-command-fnm-"));
    temporaryDirectories.push(home);
    const versionsRoot = path.join(home, ".local/share/fnm/node-versions");
    for (const version of ["v18.20.0", "v22.16.0"]) {
      const bin = path.join(versionsRoot, version, "installation/bin");
      await mkdir(bin, { recursive: true });
      await writeFile(path.join(bin, "dev-cleaner-fnm-tool"), "#!/bin/sh\necho ok\n");
      await chmod(path.join(bin, "dev-cleaner-fnm-tool"), 0o755);
    }
    await writeFile(path.join(versionsRoot, "not-a-version"), "file");

    expect(await resolveExecutable("dev-cleaner-fnm-tool", { homeDirectory: home })).toBe(
      path.join(versionsRoot, "v22.16.0/installation/bin/dev-cleaner-fnm-tool"),
    );
  });

  it("executes without a shell and captures output", async () => {
    const result = await runCommand({ executable: "/bin/echo", args: ["hello; not-a-command"] });
    expect(result.stdout.trim()).toBe("hello; not-a-command");
    expect(result.stderr).toBe("");
  });

  it("passes the additional PATH to child processes", async () => {
    const result = await runCommand({ executable: "/usr/bin/env", args: [] }, undefined, "/custom/tools");
    expect(result.stdout).toContain("PATH=/custom/tools");
  });

  it("keeps only the bounded tail of large command output", async () => {
    const result = await runCommand({
      executable: process.execPath,
      args: ["-e", "process.stdout.write('x'.repeat(70000))"],
    });
    expect(result.stdout).toHaveLength(64 * 1024);
  });

  it("reports non-zero exits, timeouts, and cancellation", async () => {
    await expect(runCommand({ executable: "/bin/sh", args: ["-c", "echo failed >&2; exit 2"] })).rejects.toThrow(
      "failed",
    );
    await expect(runCommand({ executable: "/bin/sh", args: ["-c", "sleep 1"], timeoutMs: 10 })).rejects.toThrow(
      "timed out",
    );

    const controller = new AbortController();
    const running = runCommand({ executable: "/bin/sh", args: ["-c", "sleep 1"] }, controller.signal);
    controller.abort("user cancelled");
    await expect(running).rejects.toMatchObject({ name: "AbortError" });
    await expect(runCommand({ executable: "/definitely/missing/dev-cleaner", args: [] })).rejects.toThrow("ENOENT");
  });

  it("rejects with the caller's abort reason when it is an error", async () => {
    const controller = new AbortController();
    const reason = new Error("scan replaced");
    const running = runCommand({ executable: "/bin/sh", args: ["-c", "sleep 1"] }, controller.signal);
    controller.abort(reason);
    await expect(running).rejects.toBe(reason);
  });

  it("stops the whole process tree before reporting cancellation", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-command-tree-"));
    temporaryDirectories.push(directory);
    const pidFile = path.join(directory, "grandchild.pid");
    const controller = new AbortController();
    const running = runCommand(
      { executable: "/bin/sh", args: ["-c", `sleep 30 & echo $! > "${pidFile}"; wait`] },
      controller.signal,
    );
    const grandchild = await waitForPid(pidFile);
    controller.abort();
    await expect(running).rejects.toMatchObject({ name: "AbortError" });
    expect(isRunning(grandchild)).toBe(false);
  });

  it("escalates to SIGKILL and waits for exit when a timed-out command ignores SIGTERM", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-command-kill-"));
    temporaryDirectories.push(directory);
    const pidFile = path.join(directory, "grandchild.pid");
    const startedAt = Date.now();
    const running = runCommand({
      executable: "/bin/sh",
      args: ["-c", `trap '' TERM; sleep 30 & echo $! > "${pidFile}"; wait`],
      timeoutMs: 100,
    });
    const grandchild = await waitForPid(pidFile);
    await expect(running).rejects.toThrow("timed out after 100ms");
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1_000);
    expect(isRunning(grandchild)).toBe(false);
  });
});
