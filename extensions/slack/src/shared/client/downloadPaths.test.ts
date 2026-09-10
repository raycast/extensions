import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { expandDownloadDir, resolveUniquePath, sanitizeFilename } from "./downloadPaths";

test("expandDownloadDir defaults to ~/Downloads and expands ~", () => {
  assert.equal(expandDownloadDir(), path.join(homedir(), "Downloads"));
  assert.equal(expandDownloadDir("   "), path.join(homedir(), "Downloads"));
  assert.equal(expandDownloadDir("~"), homedir());
  assert.equal(expandDownloadDir("~/Slack"), path.join(homedir(), "Slack"));
  assert.equal(expandDownloadDir("/tmp/slack-files"), path.resolve("/tmp/slack-files"));
});

test("sanitizeFilename strips path separators and unsafe characters", () => {
  assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
  assert.equal(sanitizeFilename("a/b/report.pdf"), "report.pdf");
  assert.equal(sanitizeFilename('bad:name*?"<>|.txt'), "bad_name______.txt");
  assert.equal(sanitizeFilename("   "), "download");
  assert.equal(sanitizeFilename("...."), "download");
});

test("resolveUniquePath appends a counter on collision", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slack-dl-"));

  const first = await resolveUniquePath(dir, "photo.png");
  assert.equal(first, path.join(dir, "photo.png"));

  await writeFile(first, "x");
  const second = await resolveUniquePath(dir, "photo.png");
  assert.equal(second, path.join(dir, "photo (2).png"));

  await writeFile(second, "x");
  const third = await resolveUniquePath(dir, "photo.png");
  assert.equal(third, path.join(dir, "photo (3).png"));
});

test("resolveUniquePath handles filenames without an extension", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slack-dl-"));

  const first = await resolveUniquePath(dir, "README");
  assert.equal(first, path.join(dir, "README"));

  await writeFile(first, "x");
  const second = await resolveUniquePath(dir, "README");
  assert.equal(second, path.join(dir, "README (2)"));
});
