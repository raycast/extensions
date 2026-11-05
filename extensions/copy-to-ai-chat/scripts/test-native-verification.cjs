const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function installFixture(t, change) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "chat-launcher-native-test-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  for (const file of [
    "scripts/verify-native.cjs",
    "native/WaitForComposer.swift",
    "native/build.json",
    "assets/wait-for-composer",
  ]) {
    const destination = path.join(fixture, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, file), destination);
  }
  const packageInfo = { name: "native-verification-fixture", version: "1.0.0" };
  fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({
    ...packageInfo,
    private: true,
    scripts: { postinstall: manifest.scripts.postinstall },
  }));
  fs.writeFileSync(path.join(fixture, "package-lock.json"), JSON.stringify({
    ...packageInfo,
    lockfileVersion: 3,
    packages: { "": { ...packageInfo, hasInstallScript: true } },
  }));
  change?.(fixture);
  // Exercise the npm lifecycle used by Raycast CI without installing dependencies.
  const result = spawnSync("npm", [
    "ci", "--offline", "--ignore-scripts=false", "--no-audit", "--no-fund",
  ], { cwd: fixture, encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

test("npm ci verifies the matching bundled native helper", (t) => {
  const result = installFixture(t);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Bundled native helper matches its source\/build record/);
});

test("npm ci rejects changed Swift source before packaging", (t) => {
  const result = installFixture(t, (fixture) => {
    fs.appendFileSync(path.join(fixture, "native/WaitForComposer.swift"), "\n// Changed after compilation\n");
  });
  assert.notEqual(result.status, 0);
  assert.match(result.output, /Swift source changed/);
});

test("npm ci rejects a changed bundled binary", (t) => {
  const result = installFixture(t, (fixture) => {
    fs.appendFileSync(path.join(fixture, "assets/wait-for-composer"), "changed");
  });
  assert.notEqual(result.status, 0);
  assert.match(result.output, /Bundled helper differs from its build record/);
});
