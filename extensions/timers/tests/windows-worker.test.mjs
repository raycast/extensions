import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

const binary = resolve("rust/target/debug/timers-windows.exe");
async function assertExited(pid) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return;
      throw error;
    }
    await delay(100);
  }
  assert.fail(`Timer worker ${pid} did not exit`);
}
function call(name, args, onSpawn = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [name], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    onSpawn(child.pid);
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr || `exit ${code}`)),
    );
    child.stdin.end(JSON.stringify(args));
  });
}
function fixture(seconds = 10, ringContinuously = false) {
  const directory = mkdtempSync(join(tmpdir(), "raycast timers 茶 test-"));
  const file = join(directory, "test.timer");
  const config = {
    timerFile: file,
    workerId: randomUUID(),
    deadline: Date.now() + seconds * 1000,
    soundPath: resolve("assets/pianoChime.wav"),
    speak: false,
    volume: 0,
    ringContinuously,
    notificationAppId: "timers.lifecycle-test.invalid", // No real application notification identity.
  };
  const raw = { workerId: config.workerId, lastPaused: "---", name: "Tea 茶 <&\"'", windows: config };
  const publish = (record) => {
    writeFileSync(`${file}.tmp`, JSON.stringify(record));
    renameSync(`${file}.tmp`, file);
  };
  publish(raw);
  return {
    config,
    file,
    raw,
    publish,
    async cleanup() {
      rmSync(file, { force: true });
      await delay(700);
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("worker survives the short-lived bridge process and recovery reuses its owner", async () => {
  const f = fixture();
  try {
    const pid = await call("ensure_timer_worker", [JSON.stringify(f.config)]);
    await delay(300);
    assert.equal(await call("ensure_timer_worker", [JSON.stringify(f.config)]), pid);
    assert.ok(existsSync(`${f.file}.${f.config.workerId}.ready`));
    f.publish({ ...f.raw, lastPaused: new Date().toISOString() });
    await delay(500);
    assert.ok(!existsSync(`${f.file}.${f.config.workerId}.ready`));
    await assertExited(pid);
    assert.ok(existsSync(f.file));
  } finally {
    await f.cleanup();
  }
});

test("one-shot timer completes and continuous alert stops when dismissed", async () => {
  for (const continuously of [false, true]) {
    const f = fixture(1, continuously);
    try {
      const pid = await call("ensure_timer_worker", [JSON.stringify(f.config)]);
      if (continuously) await delay(2500);
      else {
        const deadline = Date.now() + 15000;
        while (existsSync(`${f.file}.${f.config.workerId}.ready`) && Date.now() < deadline) await delay(100);
      }
      const errorFile = `${f.file}.error`;
      if (existsSync(errorFile)) assert.match(readFileSync(errorFile, "utf8"), /^Notification:/);
      if (continuously) {
        assert.ok(existsSync(f.file));
        assert.ok(existsSync(`${f.file}.${f.config.workerId}.ready`));
        rmSync(f.file);
        await delay(500);
        assert.ok(!existsSync(`${f.file}.${f.config.workerId}.ready`));
      } else {
        // Notification failure remains visible after the one-shot sound completes.
        assert.ok(existsSync(f.file));
        assert.ok(existsSync(errorFile));
      }
      await assertExited(pid);
    } finally {
      await f.cleanup();
    }
  }
});

test("invalid alert settings fail before a worker is acknowledged", async () => {
  const f = fixture();
  try {
    await assert.rejects(call("ensure_timer_worker", [JSON.stringify({ ...f.config, volume: 2 })]), /volume/);
    await assert.rejects(
      call("ensure_timer_worker", [JSON.stringify({ ...f.config, soundPath: `${f.file}.missing` })]),
      /missing/,
    );
    assert.ok(!existsSync(`${f.file}.${f.config.workerId}.ready`));
  } finally {
    await f.cleanup();
  }
});

test("resume creates a new generation and a dead worker can be recovered", async () => {
  const f = fixture(20);
  try {
    const firstPid = await call("ensure_timer_worker", [JSON.stringify(f.config)]);
    f.publish({ ...f.raw, lastPaused: new Date().toISOString() });
    await delay(400);
    const resumed = { ...f.config, workerId: randomUUID(), deadline: Date.now() + 20000 };
    f.publish({ ...f.raw, workerId: resumed.workerId, windows: resumed });
    const secondPid = await call("ensure_timer_worker", [JSON.stringify(resumed)]);
    assert.notEqual(secondPid, firstPid);
    process.kill(secondPid);
    await delay(400);
    const recoveredPid = await call("ensure_timer_worker", [JSON.stringify(resumed)]);
    assert.notEqual(recoveredPid, secondPid);
    assert.ok(existsSync(f.file));
  } finally {
    await f.cleanup();
  }
});

test("multiple timers and speech preview have independent lifetimes", async () => {
  const fixtures = [fixture(20), fixture(20)];
  try {
    const pids = await Promise.all(fixtures.map((f) => call("ensure_timer_worker", [JSON.stringify(f.config)])));
    assert.notEqual(pids[0], pids[1]);
    await call("preview_sound", ["", true, 0]);
    assert.ok(fixtures.every((f) => existsSync(`${f.file}.${f.config.workerId}.ready`)));
  } finally {
    await Promise.all(fixtures.map((f) => f.cleanup()));
  }
});

test("simultaneous recovery calls acknowledge a single worker", async () => {
  const f = fixture(20);
  try {
    const pids = await Promise.all(
      Array.from({ length: 3 }, () => call("ensure_timer_worker", [JSON.stringify(f.config)])),
    );
    assert.equal(new Set(pids).size, 1);
  } finally {
    await f.cleanup();
  }
});

test("preview Stop closes its process and an old token cannot stop a new preview", async () => {
  const start = (token) => {
    let pid;
    const done = call("play_preview", [resolve("assets/alarmClock.wav"), false, 0, token], (value) => {
      pid = value;
    });
    return { done, pid };
  };
  const stop = async (token) => {
    const deadline = Date.now() + 5000;
    while (!(await call("stop_preview", [token]))) {
      assert.ok(Date.now() < deadline, "preview did not create its stop event");
      await delay(25);
    }
  };
  const firstToken = randomUUID();
  const first = start(firstToken);
  await stop(firstToken); // Includes Stop racing bridge startup.
  await first.done;
  await assertExited(first.pid);
  const secondToken = randomUUID();
  const second = start(secondToken);
  try {
    assert.equal(await call("stop_preview", [firstToken]), false);
    await stop(secondToken);
    await second.done;
    await assertExited(second.pid);
  } finally {
    await call("stop_preview", [secondToken]);
    await second.done;
  }
});

test("failed preview setup releases its stop event", async () => {
  const token = randomUUID();
  await assert.rejects(call("play_preview", [resolve("assets/missing.wav"), false, 0, token]));
  assert.equal(await call("stop_preview", [token]), false);
});

test(
  "timer worker delivers a real notification using the running Raycast identity",
  {
    skip: process.env.RAYCAST_TIMERS_TEST_NOTIFICATION !== "1",
  },
  async () => {
    const f = fixture(1);
    try {
      f.config.notificationAppId = await call("notification_app_id", []);
      f.raw.name = "Timers worker verification";
      f.publish(f.raw);
      const pid = await call("ensure_timer_worker", [JSON.stringify(f.config)]);
      await assertExitedAfterPlayback(pid);
      assert.ok(!existsSync(`${f.file}.error`));
      assert.ok(!existsSync(f.file));
    } finally {
      await f.cleanup();
    }
  },
);

async function assertExitedAfterPlayback(pid) {
  await delay(7000);
  await assertExited(pid);
}
