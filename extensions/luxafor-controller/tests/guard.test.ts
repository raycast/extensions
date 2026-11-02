import { mkdtemp, rm, mkdir, utimes, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { requestGuard } from "../src/request-guard";
import { BusyError } from "../src/luxafor-service";

// Kernel locking is a macOS requirement. Portable tests do not qualify it.
describe.skipIf(process.platform !== "darwin")("native command guard", () => {
  it("serializes independent guards and permits a later request after release", async () => {
    const path = await mkdtemp(join(tmpdir(), "luxafor-test-"));
    try {
      const release = await requestGuard(path)(() => undefined);
      try {
        await expect(requestGuard(path)(() => undefined)).rejects.toBeInstanceOf(BusyError);
      } finally {
        await release();
      }
      await (
        await requestGuard(path)(() => undefined)
      )();
    } finally {
      await rm(path, { recursive: true, force: true });
    }
  });
  it("ignores stale marker contents and abandoned legacy lock directories", async () => {
    const path = await mkdtemp(join(tmpdir(), "luxafor-test-"));
    try {
      await mkdir(join(path, "luxafor-request.lock"));
      await writeFile(join(path, "luxafor-request.guard"), "abandoned marker");
      await (
        await requestGuard(path)(() => undefined)
      )();
    } finally {
      await rm(path, { recursive: true, force: true });
    }
  });
  it("an independent process cannot acquire a held guard", async () => {
    const path = await mkdtemp(join(tmpdir(), "luxafor-test-"));
    const release = await requestGuard(path)(() => undefined);
    try {
      await expect(
        promisify(execFile)("/usr/bin/lockf", [
          "-k",
          "-s",
          "-t",
          "0",
          join(path, "luxafor-request.guard"),
          "/usr/bin/true",
        ]),
      ).rejects.toMatchObject({ code: 75 });
    } finally {
      await release();
      await rm(path, { recursive: true, force: true });
    }
  });
  it("never steals a live lock just because its timestamp is old", async () => {
    const path = await mkdtemp(join(tmpdir(), "luxafor-test-"));
    const release = await requestGuard(path)(() => undefined);
    try {
      const old = new Date(Date.now() - 60_000);
      for (const name of await readdir(path)) await utimes(join(path, name), old, old);
      await expect(requestGuard(path)(() => undefined)).rejects.toBeInstanceOf(BusyError);
    } finally {
      await release();
      await rm(path, { recursive: true, force: true });
    }
  });
  it("recovers after a killed command and keeps a suspended owner exclusive", async () => {
    const path = await mkdtemp(join(tmpdir(), "luxafor-test-"));
    const compiled = await build({
      entryPoints: ["src/request-guard.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      write: false,
    });
    const child = spawn(
      process.execPath,
      [
        "-e",
        compiled.outputFiles[0].text +
          `
      module.exports.requestGuard(process.argv[1])(() => undefined).then(() => {
        process.stdout.write('locked'); setInterval(() => {}, 1000);
      });`,
        path,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    try {
      await once(child.stdout, "data");
      child.kill("SIGSTOP");
      await expect(requestGuard(path)(() => undefined)).rejects.toBeInstanceOf(BusyError);
      child.kill("SIGKILL");
      await once(child, "exit");
      // Pipe EOF releases the orphan helper's kernel lock; poll only the filesystem guard.
      let release: (() => Promise<void>) | undefined;
      for (let attempt = 0; !release && attempt < 50; attempt++) {
        try {
          release = await requestGuard(path)(() => undefined);
        } catch (error) {
          if (!(error instanceof BusyError)) throw error;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      expect(release).toBeTypeOf("function");
      await release!();
    } finally {
      child.kill("SIGKILL");
      await rm(path, { recursive: true, force: true });
    }
  });
});
