const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

// Only a temporary COPY is executed with a native-helper fixture. Never run
// the shipped helper against the host from this test suite.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "toggle-menu-bar-test-"));
const helper = path.join(directory, "menu-bar-auto-hide");
fs.copyFileSync(path.resolve(__dirname, "../assets/menu-bar-auto-hide"), helper);
fs.writeFileSync(
  path.join(directory, "menu-bar-auto-hide-native"),
  `#!/bin/bash
# Fixture for the native helper: emulates status, target choice, and result
# reporting without touching the host.
if [[ "$1" == "status" ]]; then
  [[ "$NATIVE_READ_FAIL" == "1" ]] && { echo 'fixture status failure' >&2; exit 1; }
  printf '%s' "$*" > "$CALL_ARGS"
  printf 'option=%s\\n' "$FIXTURE_CURRENT"
  exit 0
elif [[ "$1" == "toggle" ]]; then
  [[ "$NATIVE_READ_FAIL" == "1" ]] && { echo 'fixture status failure' >&2; exit 1; }
  if [[ "$FIXTURE_CURRENT" == "$2" ]]; then chosen="$3"; else chosen="$2"; fi
elif [[ "$1" == "set" ]]; then
  chosen="$2"
else
  echo "unexpected native args: $*" >&2
  exit 90
fi
printf '%s' "$*" > "$CALL_ARGS"
printf '%s' "$chosen" > "$CALL_FILE"
[[ "$NATIVE_FAIL" == "1" ]] && { echo 'fixture native failure' >&2; exit 1; }
printf '%s\\n' "\${NATIVE_OUTPUT:-option=$chosen}"
`,
  { mode: 0o755 },
);
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
const modes = ["always", "desktop-only", "fullscreen-only", "never"];
const labels = ["Always", "On Desktop Only", "In Full Screen Only", "Never"];
let invocation = 0;
function baseEnv(current = 0, extra = {}) {
  const id = invocation++;
  return {
    PATH: process.env.PATH,
    CALL_FILE: path.join(directory, `call-${id}`),
    CALL_ARGS: path.join(directory, `call-${id}.args`),
    FIXTURE_CURRENT: String(current),
    ...extra,
  };
}
function run(args, current = 0, extra = {}) {
  const env = baseEnv(current, extra);
  fs.writeFileSync(env.CALL_FILE, "");
  fs.writeFileSync(env.CALL_ARGS, "");
  const result = spawnSync("/bin/bash", [helper, ...args], { encoding: "utf8", env });
  return { ...result, applied: fs.readFileSync(env.CALL_FILE, "utf8"), nativeArgs: fs.readFileSync(env.CALL_ARGS, "utf8") };
}
function runAsync(args, current = 0, extra = {}) {
  const env = baseEnv(current, extra);
  fs.writeFileSync(env.CALL_FILE, "");
  fs.writeFileSync(env.CALL_ARGS, "");
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/bash", [helper, ...args], { env });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (status) =>
      resolve({
        status,
        stdout,
        stderr,
        applied: fs.readFileSync(env.CALL_FILE, "utf8"),
        nativeArgs: fs.readFileSync(env.CALL_ARGS, "utf8"),
      }),
    );
  });
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
  test(`status ${modes[current]} reads through the native helper without mutation`, () => {
    const result = run(["status"], current);
    assert.equal(result.status, 0);
    assert.equal(result.applied, "");
    assert.equal(result.nativeArgs, "status");
    assert.equal(result.stdout.trim(), `Menu bar auto-hide: ${labels[current]}`);
  });
}
test("bare invocation without a command shows usage", () => {
  const result = run([], 0);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.applied, "");
});
test("unreadable status exits unsuccessfully without success output or native mutation", () => {
  const result = run(["status"], 0, { NATIVE_READ_FAIL: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.applied, "");
});
test("unreadable mode prevents toggle mutation", () => {
  const result = run(["toggle", "always", "never"], 0, { NATIVE_READ_FAIL: "1" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.applied, "");
});
for (const extra of [{ NATIVE_FAIL: "1" }, { NATIVE_OUTPUT: "garbage" }, { NATIVE_OUTPUT: "option=3" }]) {
  test(`set rejects failed or unconfirmed result ${JSON.stringify(extra)}`, () => {
    const result = run(["set", "always"], 0, extra);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  });
}
test("toggle forwards both options to a single native call", () => {
  const result = run(["toggle", "always", "never"], 0);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.nativeArgs, "toggle 0 3");
  assert.equal(result.applied, "3");
  assert.equal(result.stdout.trim(), "Menu bar auto-hide: Never");
});
test("concurrent toggles each complete through a single native call", async () => {
  const [first, second] = await Promise.all([
    runAsync(["toggle", "always", "never"], 0),
    runAsync(["toggle", "always", "never"], 0),
  ]);
  for (const result of [first, second]) {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.nativeArgs, "toggle 0 3");
    assert.equal(result.applied, "3");
  }
});
