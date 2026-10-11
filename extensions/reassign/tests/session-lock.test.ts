import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { ModuleKind, transpileModule } from "typescript";

const shared = vi.hoisted(() => ({ path: "" }));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return shared.path;
    },
  },
}));

// Exercise the real kernel lock on the extension's supported platform.
// The portable failure-path suite separately tests fail-closed behavior.
describe.skipIf(process.platform !== "darwin")("macOS session lock", () => {
  const children = new Set<ChildProcess>();
  beforeEach(async () => {
    vi.resetModules();
    shared.path = await mkdtemp(join(tmpdir(), "reassign-lock-test-"));
  });
  afterEach(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGKILL");
        await exited;
      }
    }
    children.clear();
    await rm(shared.path, { recursive: true, force: true });
  });

  it("keeps the same inode across acquisitions and releases after success or failure", async () => {
    const { withSessionLock } = await import("../src/lib/session-lock");
    expect(await withSessionLock(async () => "first")).toBe("first");
    const path = join(shared.path, "oauth-session");
    const before = await stat(path);
    expect(before.mode & 0o777).toBe(0o600);
    await expect(
      withSessionLock(async () => {
        throw new Error("action failed");
      }),
    ).rejects.toThrow("action failed");
    expect(await withSessionLock(async () => "next")).toBe("next");
    expect((await stat(path)).ino).toBe(before.ino);
  });

  it.each([false, true])("holds ownership until a pending action settles (reject: %s)", async (reject) => {
    const { withSessionLock } = await import("../src/lib/session-lock");
    let finish!: () => void;
    let started!: () => void;
    const entered = new Promise<void>((r) => {
      started = r;
    });
    const order: string[] = [];
    const first = withSessionLock(async () => {
      started();
      await new Promise<void>((r) => {
        finish = r;
      });
      order.push("settled");
      if (reject) throw new Error("write failed");
    }).catch((error: Error) => error.message);
    await entered;
    const next = withSessionLock(async () => {
      order.push("next");
    });
    try {
      await delay(150);
      expect(order).toEqual([]);
    } finally {
      finish();
      await Promise.all([first, next]);
    }
    expect(order).toEqual(["settled", "next"]);
  });

  async function childHolder() {
    // Compile the actual wrapper, replacing only the Raycast host environment.
    const source = (await readFile(new URL("../src/lib/session-lock.ts", import.meta.url), "utf8")).replace(
      'import { environment } from "@raycast/api";',
      "const environment = { supportPath: process.argv[1] };",
    );
    const script =
      transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText +
      `
      withSessionLock(async () => {
        process.send("locked");
        await new Promise(resolve => process.once("message", resolve));
      }).then(() => process.disconnect(), error => { console.error(error); process.exit(1); });
    `;
    const child = spawn(process.execPath, ["-e", script, shared.path], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
    children.add(child);
    const ready = once(child, "message");
    const failed = new Promise<never>((_, reject) => {
      child.once("exit", (code, signal) => reject(new Error(`Lock holder exited before ready: ${code}/${signal}`)));
    });
    expect((await Promise.race([ready, failed]))[0]).toBe("locked");
    return child;
  }

  it("does not steal from a suspended process even when the lock file looks stale", async () => {
    const { withSessionLock } = await import("../src/lib/session-lock");
    const child = await childHolder();
    child.kill("SIGSTOP");
    await utimes(join(shared.path, "oauth-session"), new Date(0), new Date(0));
    let entered = false;
    const next = withSessionLock(async () => {
      entered = true;
    });
    try {
      await delay(250);
      expect(entered).toBe(false);
    } finally {
      child.kill("SIGCONT");
      child.send("finish");
      await next;
    }
    expect(entered).toBe(true);
  });

  it("recovers automatically when an owning process exits without cleanup", async () => {
    const { withSessionLock } = await import("../src/lib/session-lock");
    const child = await childHolder();
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    expect(await withSessionLock(async () => "recovered")).toBe("recovered");
  });
});
