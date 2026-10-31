import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const binary = new URL("../assets/digup", import.meta.url);

test("release executable matches its public provenance and contains no private build paths", () => {
  const data = readFileSync(binary);
  const receipt = JSON.parse(readFileSync(new URL("../ENGINE-BUILD.json", import.meta.url), "utf8"));
  assert.equal(createHash("sha256").update(data).digest("hex"), receipt.sha256);
  assert.equal(data.length, receipt.bytes);
  for (const prefix of ["/Users/", "/home/"]) assert.equal(data.includes(Buffer.from(prefix)), false);
  assert.equal(receipt.architecture, "arm64");
  for (const [file, expected] of Object.entries(receipt.sourceSHA256)) {
    const source = readFileSync(new URL(`../native/${file}`, import.meta.url));
    assert.equal(createHash("sha256").update(source).digest("hex"), expected, file);
  }
});
