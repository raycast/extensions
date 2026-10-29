const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { spawn, spawnSync } = require("node:child_process");

// Compile the real parser, target choice, pulse and locking, substituting only
// preference storage and macOS side effects at compile time. Never execute the
// shipped binary in automated tests. Every process shares an isolated file.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "toggle-menu-bar-native-"));
const executable = path.join(directory, "menu-bar-auto-hide-native");
const children = new Set();
test.after(async () => {
  for (const process of children) process.child.kill("SIGKILL");
  await Promise.all([...children].map((process) => process.done));
  fs.rmSync(directory, { recursive: true, force: true });
});
const compile = spawnSync(
  "xcrun",
  [
    "clang",
    "-fobjc-arc",
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-O2",
    "-mmacosx-version-min=13.0",
    "-DMENU_BAR_TEST_BACKEND",
    "-framework",
    "Foundation",
    path.resolve(__dirname, "../native/menu-bar-auto-hide-native.m"),
    "-o",
    executable,
  ],
  { encoding: "utf8" },
);
assert.equal(compile.status, 0, compile.stderr || String(compile.error));

let invocation = 0;
function fixture(initial, mirror = initial) {
  const prefix = path.join(directory, String(invocation++));
  const state = prefix + ".state";
  const lock = prefix + ".lock";
  fs.writeFileSync(state, `${initial} ${mirror}\n`);
  return {
    state: () => fs.readFileSync(state, "utf8").trim().split(/\s+/).map(Number),
    lock,
    run(args, extra = {}) {
      const child = spawn(executable, args.map(String), {
        env: {
          PATH: process.env.PATH,
          MENU_BAR_PULSE_STEP_MS: "20",
          MENU_BAR_MUTATION_LOCK_FILE: lock,
          TMB_TEST_STATE: state,
          ...extra,
        },
        stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"],
      });
      const events = [];
      const changes = new EventEmitter();
      let stdout = "",
        stderr = "",
        buffer = "",
        finished = false;
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.stdio[3].on("data", (chunk) => {
        buffer += chunk;
        let newline;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          events.push(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          changes.emit("change");
        }
      });
      // A killed holder can close its barrier pipe before test cleanup.
      child.stdio[4].on("error", () => {});
      const timeout = setTimeout(() => child.kill("SIGKILL"), 10000);
      const execution = {
        child,
        events,
        done: new Promise((resolve) => {
          child.on("error", (error) => (stderr += error.message));
          child.on("close", (code, signal) => {
            finished = true;
            clearTimeout(timeout);
            changes.emit("change");
            resolve({ code, signal, stdout, stderr });
            children.delete(execution);
          });
        }),
        wait(event) {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => finish(new Error(`Missing checkpoint ${event}: ${events}; ${stderr}`)),
              5000,
            );
            function finish(error) {
              clearTimeout(timer);
              changes.off("change", check);
              if (error) reject(error);
              else resolve();
            }
            function check() {
              if (events.includes(event)) finish();
              else if (finished) finish(new Error(`Process exited before ${event}: ${events}; ${stderr}`));
            }
            changes.on("change", check);
            check();
          });
        },
        release: () => child.stdio[4].write("x"),
      };
      children.add(execution);
      return execution;
    },
  };
}
async function success(process, option) {
  const result = await process.done;
  assert.equal(result.code, 0, JSON.stringify(result));
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `option=${option}\n`);
}
function assertWaiting(process) {
  assert.deepEqual(process.events, ["contended"], "A waiter must not read or write before acquiring the lock");
}
function pulse(target) {
  const order = [2, 0, 1, 3];
  const index = order.indexOf(target);
  return Array.from({ length: 5 }, (_, step) => order[(index + step) % 4]).concat(target);
}
function assertPulse(process, target) {
  assert.deepEqual(
    process.events.filter((event) => event.startsWith("write:")).map((event) => event.split(":").slice(2).map(Number)),
    pulse(target).map((option, index) => [option, Number(index === 0 || index >= 4)]),
  );
  assert.equal(process.events.filter((event) => event === "notify").length, 7);
}

// Every pair and both initial modes; hold the first invocation after its read
// while still inside the production lock. The second must read the first's
// final target, not the same initial value or a transient pulse value.
for (let first = 0; first < 4; first++) {
  for (let second = first + 1; second < 4; second++) {
    for (const initial of [first, second]) {
      test(`native overlapping toggles ${first}/${second} restore initial mode ${initial}`, async () => {
        const f = fixture(initial);
        const target = initial === first ? second : first;
        const holder = f.run(["toggle", first, second], { TMB_TEST_PAUSE: `read:${initial}` });
        await holder.wait("paused");
        const waiter = f.run(["toggle", first, second], { TMB_TEST_EXPECT_CONTENTION: "1" });
        await waiter.wait("contended");
        assertWaiting(waiter);
        holder.release();
        await success(holder, target);
        await success(waiter, initial);
        assertPulse(holder, target);
        assertPulse(waiter, initial);
        assert.deepEqual(
          waiter.events.filter((event) => event.startsWith("read:")),
          [`read:${target}`, `read:${initial}`],
        );
        assert.deepEqual(f.state(), [initial, initial]);
      });
    }
  }
}

for (const target of [0, 1, 2, 3]) {
  test(`native status waits through a transient pulse before reporting ${target}`, async () => {
    const f = fixture((target + 1) % 4);
    const transient = pulse(target)[1];
    const holder = f.run(["set", target], { TMB_TEST_PAUSE: `write:2:${transient}:0` });
    await holder.wait("paused");
    assert.deepEqual(f.state(), [transient, target], "Pause at an actual intermediate preference value");
    const reader = f.run(["status"], { TMB_TEST_EXPECT_CONTENTION: "1" });
    await reader.wait("contended");
    assertWaiting(reader);
    holder.release();
    await success(holder, target);
    await success(reader, target);
    assert.deepEqual(reader.events, ["contended", "locked", `read:${target}`]);
    assertPulse(holder, target);
  });
}

test("native set waits for an overlapping toggle's complete pulse", async () => {
  const f = fixture(0);
  const holder = f.run(["toggle", 0, 3], { TMB_TEST_PAUSE: "write:2:2:0" });
  await holder.wait("paused");
  const setter = f.run(["set", 1], { TMB_TEST_EXPECT_CONTENTION: "1" });
  await setter.wait("contended");
  assertWaiting(setter);
  holder.release();
  await success(holder, 3);
  await success(setter, 1);
  assertPulse(holder, 3);
  assertPulse(setter, 1);
  assert.deepEqual(f.state(), [1, 1]);
});

test("native toggle reads a preceding set's final mode after waiting through its pulse", async () => {
  const f = fixture(0);
  const holder = f.run(["set", 2], { TMB_TEST_PAUSE: "write:2:0:0" });
  await holder.wait("paused");
  const toggler = f.run(["toggle", 0, 2], { TMB_TEST_EXPECT_CONTENTION: "1" });
  await toggler.wait("contended");
  assertWaiting(toggler);
  holder.release();
  await success(holder, 2);
  await success(toggler, 0);
  assertPulse(toggler, 0);
  assert.deepEqual(f.state(), [0, 0]);
});

test("kernel releases a killed native holder's lock without removing its lock file", async () => {
  const f = fixture(0);
  const holder = f.run(["set", 3], { TMB_TEST_PAUSE: "write:2:2:0" });
  await holder.wait("paused");
  const inode = fs.statSync(f.lock).ino;
  const setter = f.run(["set", 1], { TMB_TEST_EXPECT_CONTENTION: "1" });
  await setter.wait("contended");
  assertWaiting(setter);
  holder.child.kill("SIGKILL");
  assert.equal((await holder.done).signal, "SIGKILL");
  await success(setter, 1);
  assert.equal(fs.statSync(f.lock).ino, inode);
  assert.deepEqual(f.state(), [1, 1]);
});

test("native status falls back to the Control Center mirror when globals are unreadable", async () => {
  await success(fixture(-1, 2).run(["status"]), 2);
});

test("native unreadable toggle fails without writing or reporting success", async () => {
  const f = fixture(-1);
  const process = f.run(["toggle", 0, 2]);
  const result = await process.done;
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Could not determine/);
  assert.ok(process.events.every((event) => !event.startsWith("write:")));
  assert.deepEqual(f.state(), [-1, -1]);
});

test("native parser rejects invalid commands before acquiring a lock or changing state", async () => {
  for (const args of [[], ["set", 4], ["set", "x"], ["toggle", 0, -1], ["status", 0]]) {
    const f = fixture(2);
    const process = f.run(args);
    const result = await process.done;
    assert.equal(result.code, 2, JSON.stringify(args));
    assert.equal(result.stdout, "");
    assert.deepEqual(process.events, []);
    assert.deepEqual(f.state(), [2, 2]);
    assert.equal(fs.existsSync(f.lock), false);
  }
});
