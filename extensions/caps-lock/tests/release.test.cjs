const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");

const { scripts } = require("../package.json");

function fixture(t, failBuild) {
  const directory = mkdtempSync(join(tmpdir(), "caps-lock-release-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = join(directory, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(directory, "assets"));
  mkdirSync(join(directory, "native"));
  writeFileSync(join(directory, "assets/caps-lock"), "stale helper");
  writeFileSync(join(directory, "package.json"), JSON.stringify({ scripts }));
  copyFileSync(join(__dirname, "../native/build.sh"), join(directory, "native/build.sh"));
  if (!failBuild) copyFileSync(join(__dirname, "../native/caps-lock.c"), join(directory, "native/caps-lock.c"));

  // Exercise the real npm entry points and native build without publishing anything.
  // Each downstream CLI refuses to run until the native build replaces the asset.
  const commands = {
    ray: `
      const fs = require("node:fs");
      fs.writeFileSync("invocation.json", JSON.stringify(["ray", ...process.argv.slice(2)]));
      require("node:assert/strict").notEqual(fs.readFileSync("assets/caps-lock", "utf8"), "stale helper");
    `,
    npx: `
      const fs = require("node:fs");
      fs.writeFileSync("invocation.json", JSON.stringify(["npx", ...process.argv.slice(2)]));
      require("node:assert/strict").notEqual(fs.readFileSync("assets/caps-lock", "utf8"), "stale helper");
    `,
  };
  for (const [name, source] of Object.entries(commands)) {
    writeFileSync(join(bin, name), `#!${process.execPath}\n${source}\n`, { mode: 0o755 });
  }
  return directory;
}

for (const [command, args, expected] of [
  ["build", ["--environment", "dist"], ["ray", "build", "--environment", "dist"]],
  ["publish", [], ["npx", "@raycast/api@latest", "publish"]],
]) {
  test(`${command} replaces a stale helper before invoking Raycast`, (t) => {
    const directory = fixture(t, false);
    const result = spawnSync("npm", ["run", command, "--", ...args], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, "invocation.json"), "utf8")), expected);
    const helper = join(directory, "assets/caps-lock");
    const architectures = execFileSync("xcrun", ["lipo", "-archs", helper], { encoding: "utf8" }).trim().split(/\s+/);
    assert.deepEqual(architectures.sort(), ["arm64", "x86_64"]);
    execFileSync("codesign", ["--verify", "--strict", helper]);
  });

  test(`${command} stops before invoking Raycast if the native build fails`, (t) => {
    const directory = fixture(t, true);
    const result = spawnSync("npm", ["run", command], { cwd: directory, encoding: "utf8", timeout: 10000 });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(existsSync(join(directory, "invocation.json")), false);
    assert.equal(readFileSync(join(directory, "assets/caps-lock"), "utf8"), "stale helper");
  });
}
