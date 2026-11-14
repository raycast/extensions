import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readFileMetadataReport } from "../src/fileMetadata";

function emptyWaveFile(): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(44100, 24);
  buffer.writeUInt32LE(176400, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(0, 40);
  return buffer;
}

test("bundled file metadata reader handles a local audio file without external scripts", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "swinsian-metadata-"));
  const filePath = path.join(directory, "fixture.wav");
  try {
    await writeFile(filePath, emptyWaveFile());
    const report = await readFileMetadataReport(filePath);
    assert.equal(report.title, "File Metadata Report");
    assert.match(report.body, /File: fixture\.wav/);
    assert.match(report.body, /Container: WAVE/);
    assert.match(report.body, /Sample Rate: 44100 Hz/);
    assert.match(report.body, /Bit Depth: 16-bit/);
    assert.match(report.body, /Channels: 2/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
