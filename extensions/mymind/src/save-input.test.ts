import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { strict as assert } from "node:assert";
import test from "node:test";
import { pathToFileURL } from "url";
import {
  classifyClipboardContent,
  classifyFilePaths,
  classifyTextInput,
  getUploadBaseTitle,
  getUnsupportedUploadFiles,
  getUploadMimeType,
  isProbablyUrl,
} from "./save-input";

test("classifyTextInput detects URLs", () => {
  assert.equal(isProbablyUrl("https://example.com"), true);
  assert.deepEqual(classifyTextInput("https://example.com"), { kind: "url", value: "https://example.com" });
});

test("classifyTextInput treats plain text as notes", () => {
  assert.deepEqual(classifyTextInput("remember this"), { kind: "note", value: "remember this" });
});

test("classifyClipboardContent prefers files over text", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mymind-save-input-"));
  const filePath = join(tempDir, "image.png");
  writeFileSync(filePath, "png");

  assert.deepEqual(classifyClipboardContent({ file: filePath, text: "https://example.com" }), {
    kind: "files",
    value: [filePath],
  });
});

test("classifyClipboardContent detects links and notes", () => {
  assert.deepEqual(classifyClipboardContent({ text: "https://example.com/article" }), {
    kind: "url",
    value: "https://example.com/article",
  });
  assert.deepEqual(classifyClipboardContent({ text: "Remember this" }), {
    kind: "note",
    value: "Remember this",
  });
});

test("classifyClipboardContent converts file URLs to upload paths", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mymind-save-input-"));
  const filePath = join(tempDir, "clip.mp4");
  writeFileSync(filePath, "video");

  assert.deepEqual(classifyClipboardContent({ file: pathToFileURL(filePath).href }), {
    kind: "files",
    value: [filePath],
  });
});

test("classifyClipboardContent recognizes extensionless clipboard images", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mymind-save-input-"));
  const filePath = join(tempDir, "Image 1");
  writeFileSync(filePath, Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"));

  assert.deepEqual(classifyClipboardContent({ file: pathToFileURL(filePath).href }), {
    kind: "files",
    value: [filePath],
  });
  assert.equal(getUploadMimeType(filePath), "image/png");
});

test("classifyClipboardContent recognizes extensionless clipboard videos", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mymind-save-input-"));
  const filePath = join(tempDir, "Video 1");
  writeFileSync(filePath, Buffer.from("000000186674797069736f6d00000000", "hex"));

  assert.deepEqual(classifyClipboardContent({ file: pathToFileURL(filePath).href }), {
    kind: "files",
    value: [filePath],
  });
  assert.equal(getUploadMimeType(filePath), "video/mp4");
});

test("classifyFilePaths filters unsupported files", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mymind-save-input-"));
  const supportedPath = join(tempDir, "photo.jpg");
  const unsupportedPath = join(tempDir, "archive.zip");
  writeFileSync(supportedPath, "jpg");
  writeFileSync(unsupportedPath, "zip");

  assert.deepEqual(classifyFilePaths([supportedPath, unsupportedPath]), {
    kind: "files",
    value: [supportedPath],
  });
  assert.deepEqual(getUnsupportedUploadFiles([supportedPath, unsupportedPath]), [unsupportedPath]);
  assert.equal(getUploadMimeType(unsupportedPath), undefined);
  assert.equal(getUploadMimeType(supportedPath), "image/jpeg");
  assert.equal(getUploadBaseTitle(supportedPath), "photo");
});
