import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBackup } from "./backup";

let dir: string;
let src: string;
let backups: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bak-"));
  src = join(dir, "secrets.enc");
  backups = join(dir, "backups");
  await writeFile(src, "encrypted-bytes", "utf8");
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runBackup", () => {
  it("does nothing when disabled", async () => {
    await runBackup(src, { enabled: false, dir: backups, retention: 5 }, 1000);
    await expect(readdir(backups)).rejects.toThrow();
  });

  it("writes a timestamped copy", async () => {
    await runBackup(src, { enabled: true, dir: backups, retention: 5 }, 1000);
    expect(await readdir(backups)).toEqual(["secrets-1000.enc"]);
  });

  it("prunes to the newest N backups", async () => {
    for (const t of [1, 2, 3, 4]) {
      await runBackup(src, { enabled: true, dir: backups, retention: 2 }, t);
    }
    const files = (await readdir(backups)).sort();
    expect(files).toEqual(["secrets-3.enc", "secrets-4.enc"]);
  });

  it("no-ops when the source file is missing", async () => {
    await runBackup(join(dir, "nope.enc"), { enabled: true, dir: backups, retention: 5 }, 1000);
    await expect(readdir(backups)).rejects.toThrow();
  });
});
