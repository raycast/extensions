import assert from "node:assert/strict";
import { execFile, spawn as nodeSpawn } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  COLLECTOR_MARKER,
  collectorPaths,
  collectorStatus,
  ensureCollector,
  isOurCollector,
  MENU_BAR_DEEPLINK,
  readStream,
  rotateStream,
  WRAPPER,
  type CollectorPaths,
} from "./collector.ts";

const exec = promisify(execFile);

const psLineFor = (script: string) => `/bin/sh -c ${script.replace(/\n/g, " ")}\n`;

test("the wrapper carries a marker unique to Foqus League in its own argv", () => {
  assert.ok(WRAPPER.includes(COLLECTOR_MARKER));
  assert.ok(isOurCollector(psLineFor(WRAPPER)));
});

test("a recycled PID running an unrelated shell script is not mistaken for the collector", () => {
  assert.equal(isOurCollector("/bin/sh /usr/local/Homebrew/postinstall.sh\n"), false);
  assert.equal(isOurCollector("/bin/sh -c sleep 30\n"), false);
  assert.equal(isOurCollector("-sh\n"), false);
});

test("somebody else's log stream is not our collector either", () => {
  assert.equal(isOurCollector("log stream --predicate \"subsystem == 'com.example'\" --style ndjson\n"), false);
});

test("an empty or failed ps read is not a collector", () => {
  assert.equal(isOurCollector(""), false);
});

const ndjson = (message: string, timestamp = "2026-09-16 10:12:03+0000") =>
  JSON.stringify({ timestamp, eventMessage: message });

const startLine = (goal: string, timestamp?: string) =>
  ndjson(`Start focus session\n  Goal: ${goal}\n  Duration: 60`, timestamp);

async function tempPaths(): Promise<CollectorPaths> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foqus-collector-"));
  return collectorPaths(dir);
}

test("readStream on a stream file that does not exist yet reports nothing to resume from", async () => {
  const paths = await tempPaths();
  assert.deepEqual(await readStream(paths, 0), { events: [], records: 0, nextOffset: 0, reset: false });
});

test("an empty stream file with a non-zero offset is a reset, not a no-op", async () => {
  const paths = await tempPaths();
  await fs.writeFile(paths.out, "");
  const read = await readStream(paths, 4096);
  assert.equal(read.reset, true, "the offset points past a file that no longer has those bytes");
  assert.equal(read.nextOffset, 0);
});

test("readStream consumes from the offset and leaves the offset at the end of the file", async () => {
  const paths = await tempPaths();
  const first = `${startLine("Ship")}\n`;
  await fs.writeFile(paths.out, first);

  const one = await readStream(paths, 0);
  assert.equal(one.events.length, 1);
  assert.equal(one.nextOffset, Buffer.byteLength(first, "utf8"));
  assert.equal(one.reset, false);

  assert.deepEqual(await readStream(paths, one.nextOffset), {
    events: [],
    records: 0,
    nextOffset: one.nextOffset,
    reset: false,
  });

  const second = `${startLine("Rest", "2026-09-16 11:00:00+0000")}\n`;
  await fs.appendFile(paths.out, second);
  const two = await readStream(paths, one.nextOffset);
  assert.deepEqual(
    two.events.map((e) => (e.type === "start" ? e.goal : null)),
    ["Rest"],
    "only the bytes written since the last read",
  );
  assert.equal(two.nextOffset, Buffer.byteLength(first + second, "utf8"));
});

test("a file shorter than the offset was rotated or truncated, so it is re-read from the start", async () => {
  const paths = await tempPaths();
  await fs.writeFile(paths.out, `${startLine("After the rotation")}\n`);

  const read = await readStream(paths, 10_000_000);
  assert.equal(read.reset, true);
  assert.equal(read.events.length, 1, "the new file is read from byte zero rather than skipped");
  assert.equal(read.nextOffset, (await fs.stat(paths.out)).size);
});

test("a partial trailing line is held back until log stream finishes writing it", async () => {
  const paths = await tempPaths();
  const whole = `${startLine("Ship")}\n`;
  const torn = startLine("Half written", "2026-09-16 11:00:00+0000");
  const head = torn.slice(0, 40);
  await fs.writeFile(paths.out, whole + head);

  const one = await readStream(paths, 0);
  assert.equal(one.events.length, 1, "the torn line is not a record the user failed to produce");
  assert.equal(one.nextOffset, Buffer.byteLength(whole, "utf8"), "resume at the torn line, not past it");

  await fs.appendFile(paths.out, `${torn.slice(40)}\n`);
  const two = await readStream(paths, one.nextOffset);
  assert.deepEqual(
    two.events.map((e) => (e.type === "start" ? e.goal : null)),
    ["Half written"],
    "the line completes on the next read rather than being lost or split",
  );
});

test("a line torn inside a multi-byte character resumes on the character, not inside it", async () => {
  const paths = await tempPaths();
  const whole = Buffer.from(`${startLine("Ship")}\n`, "utf8");
  const torn = Buffer.from(`${startLine("Café ☕", "2026-09-16 11:00:00+0000")}\n`, "utf8");

  const coffee = torn.indexOf(Buffer.from("☕", "utf8"));
  assert.ok(coffee > 0, "the fixture really does carry a three-byte character");
  await fs.writeFile(paths.out, Buffer.concat([whole, torn.subarray(0, coffee + 1)]));

  const one = await readStream(paths, 0);
  assert.equal(one.events.length, 1, "only the complete line is a record");
  assert.equal(one.nextOffset, whole.length, "resume at the torn line's first byte, not mid-character");

  await fs.appendFile(paths.out, torn.subarray(coffee + 1));
  const two = await readStream(paths, one.nextOffset);
  assert.deepEqual(
    two.events.map((e) => (e.type === "start" ? e.goal : null)),
    ["Café ☕"],
    "the goal round-trips whole once the rest of the character arrives",
  );
  assert.equal(two.nextOffset, whole.length + torn.length);
});

test("a read with no newline at all consumes nothing", async () => {
  const paths = await tempPaths();
  await fs.writeFile(paths.out, startLine("Never terminated"));
  assert.deepEqual(await readStream(paths, 0), { events: [], records: 0, nextOffset: 0, reset: false });
});

test("the offset is in bytes, so a multi-byte goal name cannot desynchronise the next read", async () => {
  const paths = await tempPaths();
  const multibyte = `${startLine("Café ☕ déjà-vu 🚀")}\n`;
  const plain = `${startLine("Plain", "2026-09-16 11:00:00+0000")}\n`;
  await fs.writeFile(paths.out, multibyte + plain);

  const bytes = Buffer.byteLength(multibyte, "utf8");
  assert.ok(bytes > multibyte.length, "the fixture really does contain multi-byte characters");

  const one = await readStream(paths, 0);
  assert.equal(one.nextOffset, bytes + Buffer.byteLength(plain, "utf8"));

  const two = await readStream(paths, bytes);
  assert.deepEqual(
    two.events.map((e) => (e.type === "start" ? e.goal : null)),
    ["Plain"],
  );
});

function fakeDeps(state: { spawned: number; alive: Set<number> }) {
  return {
    spawn: () => {
      state.spawned += 1;
      const pid = 90_000 + state.spawned;
      state.alive.add(pid);
      return pid;
    },
    isAlive: async (pid: number) => state.alive.has(pid),
  };
}

test("ensureCollector spawns once and writes the PID file before it returns", async () => {
  const paths = await tempPaths();
  const state = { spawned: 0, alive: new Set<number>() };
  const deps = fakeDeps(state);

  const started = await ensureCollector(paths, deps);
  assert.equal(started.running, true);
  assert.equal(state.spawned, 1);
  assert.equal((await fs.readFile(paths.pid, "utf8")).trim(), "90001");

  await ensureCollector(paths, deps);
  assert.equal(state.spawned, 1, "a collector that is already running is not spawned again");
});

test("two commands starting in the same moment produce one collector, not two", async () => {
  const paths = await tempPaths();
  const state = { spawned: 0, alive: new Set<number>() };
  const deps = fakeDeps(state);

  const [a, b] = await Promise.all([ensureCollector(paths, deps), ensureCollector(paths, deps)]);
  assert.equal(state.spawned, 1, "the spawn lock is what keeps two streams from being opened");
  assert.equal(a.running, true);
  assert.equal(b.running, true);
});

test("a PID that is no longer our wrapper is respawned", async () => {
  const paths = await tempPaths();
  await fs.mkdir(paths.dir, { recursive: true });
  await fs.writeFile(paths.pid, "4242\n");
  const state = { spawned: 0, alive: new Set<number>() };

  const status = await ensureCollector(paths, fakeDeps(state));
  assert.equal(state.spawned, 1, "a recycled PID must not count as a healthy collector");
  assert.equal(status.running, true);
});

test("collectorStatus reports the stream size whether or not the collector is up", async () => {
  const paths = await tempPaths();
  await fs.mkdir(paths.dir, { recursive: true });
  await fs.writeFile(paths.out, "0123456789");

  const down = await collectorStatus(paths, { spawn: () => null, isAlive: async () => false });
  assert.deepEqual(down, { running: false, bytes: 10 }, "bytes is what the rotation decision reads");
});

test("rotateStream moves the stream aside and clears the PID file so the wrapper exits", async () => {
  const paths = await tempPaths();
  await fs.mkdir(paths.dir, { recursive: true });
  await fs.writeFile(paths.out, `${startLine("Before the rotation")}\n`);
  await fs.writeFile(paths.pid, "4242\n");

  await rotateStream(paths, { spawn: () => null, isAlive: async () => false });

  assert.equal(await fs.readFile(`${paths.out}.1`, "utf8").then((t) => t.includes("Before the rotation")), true);
  await assert.rejects(fs.stat(paths.out), "the collector starts a fresh stream file");
  await assert.rejects(fs.stat(paths.pid), "removing the PID file is the stop signal");
});

const quickWrapper = () => WRAPPER.replace("sleep 2\n", "sleep 0.2\n").replace("sleep 30\n", "sleep 0.2\n");

async function pokeHarness(logScript: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foqus-poke-"));
  const paths = collectorPaths(dir);
  const bin = path.join(dir, "bin");
  const calls = path.join(dir, "calls.txt");
  await fs.mkdir(bin);

  await fs.writeFile(path.join(bin, "open"), `#!/bin/sh\necho "$@" >> "${calls}"\n`, { mode: 0o755 });
  await fs.writeFile(path.join(bin, "log"), logScript, { mode: 0o755 });

  const run = new Promise<void>((resolve, reject) => {
    const child = nodeSpawn("/bin/sh", ["-c", quickWrapper()], {
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        PRED: "ignored",
        OUT: paths.out,
        ERR: paths.err,
        PIDFILE: paths.pid,
        POKE: MENU_BAR_DEEPLINK,
      },
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("exit", () => resolve());
  });

  const pokes = async () => (await fs.readFile(calls, "utf8").catch(() => "")).trim().split("\n").filter(Boolean);

  const strays = async () => {
    const { stdout } = await exec("/bin/sh", ["-c", `pgrep -f ${dir} || true`]).catch(() => ({ stdout: "" }));
    return stdout.split("\n").filter(Boolean);
  };

  const tails = async () => {
    const { stdout } = await exec("/bin/sh", ["-c", `pgrep -f "tail -n 0 -F ${paths.out}" || true`]).catch(() => ({
      stdout: "",
    }));
    return stdout.split("\n").filter(Boolean);
  };

  return { dir, paths, run, pokes, strays, tails };
}

test("every line the collector writes pokes the menu bar command", async () => {
  const h = await pokeHarness(`#!/bin/sh\nsleep 0.5\necho line-1\nsleep 0.3\necho line-2\nsleep 0.6\n`);
  await h.run;

  assert.deepEqual(await h.pokes(), [`-g ${MENU_BAR_DEEPLINK}`, `-g ${MENU_BAR_DEEPLINK}`]);
  assert.deepEqual(await h.strays(), [], "the wrapper takes tail and the reader down with it");
  await assert.rejects(fs.stat(`${h.paths.pid}.poke`), "and clears the FIFO behind it");
  await fs.rm(h.dir, { recursive: true, force: true });
});

test("a watcher orphaned by a dead wrapper retires instead of poking for a collector that is gone", async () => {
  const h = await pokeHarness(`#!/bin/sh\nsleep 0.5\necho line-1\nsleep 5\n`);

  while ((await h.pokes()).length === 0) await new Promise((r) => setTimeout(r, 50));
  const wrapperPid = Number.parseInt(await fs.readFile(h.paths.pid, "utf8"), 10);
  await fs.writeFile(h.paths.pid, "999999");
  process.kill(wrapperPid, "SIGKILL");

  await fs.appendFile(h.paths.out, "line-2\n");
  await new Promise((r) => setTimeout(r, 1500));
  assert.deepEqual(await h.pokes(), [`-g ${MENU_BAR_DEEPLINK}`], "no poke after the wrapper it belonged to died");

  assert.deepEqual(await h.tails(), [], "the retiring reader takes tail with it rather than leaving it tailing");

  for (const pid of await h.strays()) process.kill(Number(pid), "SIGKILL");
  await fs.rm(h.dir, { recursive: true, force: true });
});

test("a live collector's PID file is touched, so the helper's deadman stays fed", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foqus-touch-"));
  const paths = collectorPaths(dir);
  await fs.writeFile(paths.pid, "4242\n");
  const stale = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await fs.utimes(paths.pid, stale, stale);

  await ensureCollector(paths, { spawn: () => null, isAlive: async () => true });

  assert.ok((await fs.stat(paths.pid)).mtimeMs > Date.now() - 60_000, "the PID file must look freshly used");
  await fs.rm(dir, { recursive: true, force: true });
});
