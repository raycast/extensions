import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { assertAttributeWritable, prepareAttributeWrite } from "../src/utils/attributeWrite";

const execFileAsync = promisify(execFile);

async function binaryPlistToXml(buffer: Buffer): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "xattr-test-"));
  const tempFile = join(tempDir, "value.plist");

  try {
    await writeFile(tempFile, buffer);
    const { stdout } = await execFileAsync("plutil", ["-convert", "xml1", "-o", "-", tempFile], {
      encoding: "utf8",
    });
    return stdout;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function prepareBinaryXml(key: string, value: string): Promise<string> {
  const prepared = await prepareAttributeWrite(key, value, "text", true);

  assert.equal(prepared.mode, "buffer");
  return binaryPlistToXml(prepared.buffer);
}

test("plain text writes stay textual when typed metadata inference is disabled", async () => {
  const prepared = await prepareAttributeWrite("com.example.note", "hello", "text", false);

  assert.deepEqual(prepared, { mode: "text", value: "hello", sizeBytes: 5 });
});

test("WhereFroms preset is prepared as a binary plist string array", async () => {
  const xml = await prepareBinaryXml(
    "com.apple.metadata:kMDItemWhereFroms",
    "https://download.example\nhttps://source.example",
  );

  assert.match(xml, /<array>/);
  assert.match(xml, /<string>https:\/\/download\.example<\/string>/);
  assert.match(xml, /<string>https:\/\/source\.example<\/string>/);
});

test("Finder tags preset is prepared as a binary plist string array with Finder color suffix", async () => {
  const xml = await prepareBinaryXml("com.apple.metadata:_kMDItemUserTags", "Work\nBlue\\n6");

  assert.match(xml, /<array>/);
  assert.match(xml, /<string>Work\s+0<\/string>/);
  assert.match(xml, /<string>Blue\s+6<\/string>/);
});

test("last-used date preset is prepared as a binary plist date", async () => {
  const xml = await prepareBinaryXml("com.apple.lastuseddate#PS", "2026-07-20T12:00:00Z");

  assert.match(xml, /<date>2026-07-20T12:00:00Z<\/date>/);
});

test("binary writes normalize hex without UTF-8 conversion", async () => {
  const prepared = await prepareAttributeWrite("com.example.binary", "ff 00 10", "binary", false);

  assert.equal(prepared.mode, "buffer");
  assert.deepEqual([...prepared.buffer], [0xff, 0x00, 0x10]);
  assert.equal(prepared.sizeBytes, 3);
});

test("read-only system binary attributes are blocked by write policy", () => {
  assert.throws(() => assertAttributeWritable("com.apple.macl"), /unsafe to edit/);
  assert.throws(() => assertAttributeWritable("com.apple.FinderInfo#PS"), /unsafe to edit/);
  assert.doesNotThrow(() => assertAttributeWritable("com.apple.TextEncoding"));
});
