const assert = require("node:assert/strict");
const { execFile, execFileSync, spawn } = require("node:child_process");
const { once } = require("node:events");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  linkSync,
  mkdirSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { after, before, test } = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");
const { promisify } = require("node:util");

const run = promisify(execFile);
const root = resolve(__dirname, "..");
let buildDirectory;
let helper;

before(() => {
  assert.equal(process.platform, "darwin", "The native tests require the macOS SDK");
  buildDirectory = mkdtempSync(join(tmpdir(), "caps-lock-test-build-"));
  helper = join(buildDirectory, "caps-lock-mock");
  // Compile the production Swift logic; only the export macro is removed.
  // The C symbols below replace the keyboard APIs, so no real state is changed.
  const source = readFileSync(join(root, "swift/caps-lock/Sources/CapsLock.swift"), "utf8")
    .replace("import RaycastSwiftMacros\n", "")
    .replace("@raycast ", "");
  const nativeSource = join(buildDirectory, "CapsLock.swift");
  writeFileSync(nativeSource, source);
  const main = join(buildDirectory, "main.swift");
  writeFileSync(
    main,
    `
    import Darwin
    import Foundation
    do { print(try toggleCapsLock() ? "on" : "off") }
    catch { FileHandle.standardError.write(Data((error.localizedDescription + "\\n").utf8)); exit(1) }
  `,
  );
  const mock = join(buildDirectory, "mock-iokit.o");
  execFileSync("xcrun", ["clang", "-Wall", "-Wextra", "-Werror", "-c", join(root, "tests/mock-iokit.c"), "-o", mock]);
  execFileSync("xcrun", ["swiftc", "-warnings-as-errors", nativeSource, main, mock, "-o", helper]);
});

after(() => {
  if (buildDirectory) rmSync(buildDirectory, { recursive: true, force: true });
});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "caps-lock-test-state-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const state = join(directory, "state");
  writeFileSync(state, "0");
  const env = { ...process.env, CAPS_LOCK_TEST_DIRECTORY: directory, CAPS_LOCK_TEST_STATE: state };
  return {
    directory,
    state,
    env,
    invoke: (command, extra = {}) => run(helper, [command], { env: { ...env, ...extra }, timeout: 5000 }),
  };
}

test("overlapping processes preserve every toggle and return alternating confirmed states", async (t) => {
  const { invoke, state } = fixture(t);
  const results = await Promise.all(Array.from({ length: 12 }, () => invoke("toggle")));
  assert.equal(results.filter(({ stdout }) => stdout === "on\n").length, 6);
  assert.equal(results.filter(({ stdout }) => stdout === "off\n").length, 6);
  assert.equal(readFileSync(state, "utf8"), "0");
  assert.equal((await invoke("toggle")).stdout, "on\n");
});

test("process death releases the lock for a blocked helper", async (t) => {
  const { directory, env, state, invoke } = fixture(t);
  const marker = join(directory, "holding-lock");
  const holder = spawn(helper, ["toggle"], { env: { ...env, CAPS_LOCK_TEST_HOLD_MARKER: marker }, stdio: "ignore" });
  const exited = once(holder, "exit");
  t.after(() => holder.kill("SIGKILL"));
  const deadline = Date.now() + 3000;
  while (!existsSync(marker) && Date.now() < deadline) await delay(10);
  assert.ok(existsSync(marker), "first process reached the keyboard API while holding the lock");
  let settled = false;
  const waiter = invoke("toggle");
  waiter.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await delay(100);
  assert.equal(settled, false, "second process waits before reading or changing the state");
  assert.equal(readFileSync(state, "utf8"), "0");
  holder.kill("SIGKILL");
  await exited;
  assert.equal((await waiter).stdout, "on\n");
});

test("a failed keyboard operation releases the lock and does not report success", async (t) => {
  const { invoke, state } = fixture(t);
  for (const failure of ["service", "open", "read", "write", "verify", "verify-read"]) {
    await assert.rejects(invoke("toggle", { CAPS_LOCK_TEST_FAILURE: failure }), (error) => {
      assert.equal(error.code, 1);
      assert.equal(error.stdout, "");
      assert.ok(error.stderr.length > 0);
      return true;
    });
    assert.equal(readFileSync(state, "utf8"), failure === "verify-read" ? "1" : "0");
    writeFileSync(state, "0");
    assert.equal((await invoke("toggle")).stdout, "on\n");
    assert.equal((await invoke("toggle")).stdout, "off\n");
  }
});

test("refuses a symlink lock without changing the simulated keyboard", async (t) => {
  const { directory, state, invoke } = fixture(t);
  symlinkSync(state, join(directory, "com.raycast.caps-lock.lock"));
  await assert.rejects(invoke("toggle"), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Cannot open Caps Lock lock/);
    return true;
  });
  assert.equal(readFileSync(state, "utf8"), "0");
});

test("refuses a hard-linked or directory lock without changing the keyboard", async (t) => {
  for (const kind of ["hardlink", "directory"]) {
    const { directory, state, invoke } = fixture(t);
    const lock = join(directory, "com.raycast.caps-lock.lock");
    if (kind === "hardlink") linkSync(state, lock);
    else mkdirSync(lock);
    await assert.rejects(invoke("toggle"));
    assert.equal(readFileSync(state, "utf8"), "0");
  }
});

test("missing user temp directory fails before keyboard access", async (t) => {
  const { invoke, state } = fixture(t);
  await assert.rejects(invoke("toggle", { CAPS_LOCK_TEST_DIRECTORY: "" }), /Cannot locate/);
  assert.equal(readFileSync(state, "utf8"), "0");
});
