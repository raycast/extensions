import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractZip } from "./zip";
import { makeZip } from "./zip-test-helper";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "proton-pass-zip-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("extracts stored and deflated files with identical bytes", async () => {
  await withTempDir(async (dir) => {
    await extractZip(
      makeZip([
        { name: "pass-cli.exe", data: Buffer.from("fake executable"), method: 0 },
        { name: "libcrypto-3-x64.dll", data: Buffer.from([0, 1, 2, 255]), method: 8 },
      ]),
      dir,
    );

    assert.deepEqual(await readFile(path.join(dir, "pass-cli.exe")), Buffer.from("fake executable"));
    assert.deepEqual(await readFile(path.join(dir, "libcrypto-3-x64.dll")), Buffer.from([0, 1, 2, 255]));
  });
});

test("rejects traversal and absolute paths", async () => {
  for (const name of ["../evil", "folder/../../evil", "/absolute", "C:\\absolute", "..\\evil"]) {
    await withTempDir(async (dir) => {
      await assert.rejects(extractZip(makeZip([{ name, data: Buffer.from("evil") }]), dir), /Unsafe ZIP path/);
    });
  }
});

test("rejects unsupported compression methods", async () => {
  await withTempDir(async (dir) => {
    const zip = makeZip([{ name: "pass-cli.exe", data: Buffer.from("exe"), method: 0 }]);
    zip.writeUInt16LE(12, zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 10);
    await assert.rejects(extractZip(zip, dir), /Unsupported ZIP compression method: 12/);
  });
});
