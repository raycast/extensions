const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Only a temporary COPY is rewritten: all defaults reads and native writes are
// replaced by fixtures. Never execute the shipped helper against the host here.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "toggle-menu-bar-test-"));
const helper = path.join(directory, "menu-bar-auto-hide");
fs.writeFileSync(
  helper,
  fs
    .readFileSync(path.resolve(__dirname, "../assets/menu-bar-auto-hide"), "utf8")
    .replaceAll("/usr/bin/defaults", '"$FIXTURE_DEFAULTS"'),
);
fs.writeFileSync(
  path.join(directory, "defaults"),
  `#!/bin/bash
[[ "$READ_FAIL" == "1" ]] && exit 1
case "$*" in
  'read -g AppleMenuBarVisibleInFullscreen') echo "$FULLSCREEN" ;;
  'read -g _HIHideMenuBar') echo "$DESKTOP" ;;
  'read com.apple.controlcenter AutoHideMenuBarOption') echo "$OPTION" ;;
  *) exit 90 ;;
esac
`,
  { mode: 0o755 },
);
fs.writeFileSync(
  path.join(directory, "menu-bar-auto-hide-native"),
  `#!/bin/bash
printf '%s' "$1" > "$CALL_FILE"
[[ "$NATIVE_FAIL" == "1" ]] && { echo 'fixture native failure' >&2; exit 1; }
printf '%s\\n' "\${NATIVE_OUTPUT:-option=$1}"
`,
  { mode: 0o755 },
);
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
const modes = ["always", "desktop-only", "fullscreen-only", "never"];
const labels = ["Always", "On Desktop Only", "In Full Screen Only", "Never"];
function run(args, current = 0, extra = {}) {
  const callFile = path.join(directory, "call");
  fs.writeFileSync(callFile, "");
  const result = spawnSync("/bin/bash", [helper, ...args], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      FIXTURE_DEFAULTS: path.join(directory, "defaults"),
      CALL_FILE: callFile,
      FULLSCREEN: String(current % 2),
      DESKTOP: current <= 1 ? "1" : "0",
      OPTION: String(current),
      ...extra,
    },
  });
  return { ...result, applied: fs.readFileSync(callFile, "utf8") };
}
for (let first = 0; first < 4; first++)
  for (let second = 0; second < 4; second++)
    for (let current = 0; current < 4; current++) {
      test(`toggle ${modes[first]} / ${modes[second]} from ${modes[current]}`, () => {
        const result = run(["toggle", modes[first], modes[second]], current);
        const expected = current === first ? second : first;
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.applied, String(expected));
        assert.equal(result.stdout.trim(), `Menu bar auto-hide: ${labels[expected]}`);
      });
    }
for (let current = 0; current < 4; current++) {
  test(`status ${modes[current]} never launches the native helper`, () => {
    const result = run(["status"], current);
    assert.equal(result.status, 0);
    assert.equal(result.applied, "");
    assert.equal(result.stdout.trim(), `Menu bar auto-hide: ${labels[current]}`);
  });
}
test("wrapper no-argument defaults match existing extension defaults", () => {
  assert.equal(run([], 0).applied, "2");
  assert.equal(run([], 3).applied, "0");
});
test("unreadable status exits unsuccessfully without success output or native mutation", () => {
  const result = run(["status"], 0, { READ_FAIL: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.applied, "");
});
test("failed status prevents toggle mutation", () => {
  const result = run(["toggle", "always", "never"], 0, { READ_FAIL: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(result.applied, "");
});
for (const extra of [{ NATIVE_FAIL: "1" }, { NATIVE_OUTPUT: "garbage" }, { NATIVE_OUTPUT: "option=3" }]) {
  test(`set rejects failed or unconfirmed result ${JSON.stringify(extra)}`, () => {
    const result = run(["set", "always"], 0, extra);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  });
}
