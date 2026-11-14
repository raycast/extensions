import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { verifyStoreMetadata } from "../scripts/store-metadata.ts";

function listing(t: { after: (cleanup: () => void) => void }) {
  const root = mkdtempSync(path.join(os.tmpdir(), "app-hopper-store-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "package.json", "package-lock.json"]) {
    writeFileSync(path.join(root, file), readFileSync(path.resolve(file)));
  }
  mkdirSync(path.join(root, "metadata"));
  writeFileSync(path.join(root, "metadata/screenshot.png"), readFileSync(path.resolve("metadata/screenshot-1.png")));
  return root;
}

test("a complete listing returns the screenshots and metadata that must be included in the submission", (t) => {
  const files = verifyStoreMetadata(listing(t));
  assert(files.includes("metadata/screenshot.png"));
  assert(files.includes("CHANGELOG.md"));
  assert(files.includes("package-lock.json"));
});

test("an empty listing or invalid changelog is rejected before opening a Store PR", (t) => {
  const root = listing(t);
  writeFileSync(path.join(root, "README.md"), " ");
  assert.throws(() => verifyStoreMetadata(root), /README.md must not be empty/);
  writeFileSync(path.join(root, "README.md"), "# App Hopper");
  writeFileSync(path.join(root, "CHANGELOG.md"), "# Changes\nReleased today");
  assert.throws(() => verifyStoreMetadata(root), /Raycast version entry/);
});

test("wrong-size or non-PNG Store screenshots are rejected", (t) => {
  const root = listing(t);
  const file = path.join(root, "metadata/screenshot.png");
  const image = readFileSync(file);
  image.writeUInt32BE(1000, 16);
  writeFileSync(file, image);
  assert.throws(() => verifyStoreMetadata(root), /2000 × 1250 PNG/);
  writeFileSync(file, "not an image");
  assert.throws(() => verifyStoreMetadata(root), /2000 × 1250 PNG/);
});

test("missing screenshots and a seventh screenshot are rejected", (t) => {
  const root = listing(t);
  const image = readFileSync(path.join(root, "metadata/screenshot.png"));
  rmSync(path.join(root, "metadata/screenshot.png"));
  assert.throws(() => verifyStoreMetadata(root), /between one and six/);
  for (let i = 0; i < 7; i++) writeFileSync(path.join(root, `metadata/${i}.png`), image);
  assert.throws(() => verifyStoreMetadata(root), /between one and six/);
});
