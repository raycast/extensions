import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const manifest = readJson(join(root, "package.json"));
const packageDirectory = join(root, "node_modules/@xeet/core");
const installed = readJson(join(packageDirectory, "package.json"));

assert.equal(
  installed.version,
  manifest.dependencies["@xeet/core"],
  "Run npm ci to install the pinned @xeet/core version",
);

function files(directory, prefix = "") {
  assert.ok(lstatSync(directory).isDirectory(), `Expected a directory, not a symlink: ${directory}`);
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) return files(join(directory, entry.name), relative + "/");
      assert.ok(entry.isFile(), `Unexpected symlink or special file: ${relative}`);
      return [relative];
    })
    .sort();
}

const reference = join(packageDirectory, "wasm");
const assets = join(root, "assets/xeet");
const expected = files(reference);
assert.deepEqual(files(assets), expected, "Bundled assets must contain exactly the npm package's WASM files and fonts");

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const file of expected) {
  assert.equal(
    sha256(join(assets, file)),
    sha256(join(reference, file)),
    `Asset differs from the npm package: ${file}`,
  );
}
console.log(`Verified ${expected.length} Xeet assets against @xeet/core@${installed.version}.`);
