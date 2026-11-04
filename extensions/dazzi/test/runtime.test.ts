import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/lib/runtime";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));


let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "dazzi-run-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("run", () => {
  it("returns the exit status and output of a program that ran", async () => {
    const result = await run("/Applications/Dazzi.app", "/bin/sh", ["-c", "echo out; echo err >&2; exit 3"], { timeoutMs: 10_000 });
    expect(result).toEqual({ status: 3, stdout: "out\n", stderr: "err\n" });
  });

  it("reports a missing executable as ENOENT with the cause", async () => {
    const result = await run("/Applications/Dazzi.app", join(dir, "missing"), [], { timeoutMs: 10_000 });
    expect(result.status).toBeNull();
    expect(result.failure?.code).toBe("ENOENT");
    expect(result.failure?.message).toContain("ENOENT");
    expect(result.failure?.message).toContain(join(dir, "missing"));
  });

  it("reports a file that may not be executed as EACCES with the cause", async () => {
    const file = join(dir, "not-executable");
    await writeFile(file, "#!/bin/sh\nexit 0\n");
    await chmod(file, 0o644);
    const result = await run("/Applications/Dazzi.app", file, [], { timeoutMs: 10_000 });
    expect(result.status).toBeNull();
    expect(result.failure?.code).toBe("EACCES");
    expect(result.failure?.message).toContain("EACCES");
  });

  it("reports a program that outlives its time as ETIMEDOUT", async () => {
    const result = await run("/Applications/Dazzi.app", "/bin/sleep", ["30"], { timeoutMs: 100 });
    expect(result.status).toBeNull();
    expect(result.failure?.code).toBe("ETIMEDOUT");
    expect(result.failure?.message).toMatch(/timed out/iu);
  });

  it("still rejects when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = run("/Applications/Dazzi.app", "/bin/sleep", ["30"], { timeoutMs: 10_000, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
