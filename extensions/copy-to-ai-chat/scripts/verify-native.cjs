const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const binary = path.join(root, "assets/wait-for-composer");
const source = path.join(root, "native/WaitForComposer.swift");
const record = JSON.parse(fs.readFileSync(path.join(root, "native/build.json"), "utf8"));
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

assert.equal(hash(source), record.sourceSha256, "Swift source changed: run npm run build:native and commit the helper");
assert.equal(hash(binary), record.binarySha256, "Bundled helper differs from its build record");
if (process.platform === "darwin") {
  for (const architecture of ["arm64", "x86_64"]) {
    execFileSync("/usr/bin/xcrun", ["lipo", binary, "-verify_arch", architecture]);
  }
  execFileSync("/usr/bin/codesign", ["--verify", "--strict", binary]);
}
console.log("Bundled native helper matches its source/build record.");
