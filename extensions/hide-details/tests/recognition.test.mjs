import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { redactImage } from "./swift.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), "hide-details-recognition-"));
const smallInput = path.join(directory, "small.png");
const swift = (file, args) =>
  execFileSync("xcrun", ["swift", "-module-cache-path", path.join(directory, "module-cache"), file, ...args], {
    encoding: "utf8",
    timeout: 90_000,
  });

before(() => swift(path.join(root, "tests/create-small-fixture.swift"), [smallInput]));
after(() => rmSync(directory, { recursive: true, force: true }));

function redact(input, name, categories, recognition, customRegex = "") {
  const output = path.join(directory, `${name}.png`);
  const report = redactImage({ inputPath: input, outputPath: output, categories, recognition, customRegex });
  const reportFile = path.join(directory, `${name}.json`);
  writeFileSync(reportFile, JSON.stringify(report));
  swift(path.join(root, "tests/check-blackout.swift"), [output, reportFile]);
  return report;
}

test("a real face is detected and every reported face pixel is covered", () => {
  const report = redact(path.join(root, "tests/fixtures/face.jpg"), "face", "face", "fast");
  assert.ok(report.hits.length > 0);
  assert.ok(report.hits.every((hit) => hit.kind === "face"));
});

test("accurate recognition detects and masks 14-point screenshot text", () => {
  const report = redact(smallInput, "small", "email", "accurate", String.raw`INV-\d{5}`);
  assert.ok(report.hits.some((hit) => hit.kind === "email"));
  assert.ok(report.hits.some((hit) => hit.kind === "custom"));
});
