const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { EventEmitter } = require("node:events");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { after, mock, test } = require("node:test");
const { createHarness, loadSource } = require("./helpers.cjs");

const { SCREEN_SAVER_WATCHER } = loadSource("screenSaver.ts", {});
const quiet = { menubar: false, status: false };
const OPEN = "-b com.apple.ScreenSaver.Engine";
const OWN =
  '   pid 200(caffeinate): [0x01] 00:10:00 PreventUserIdleDisplaySleep named: "caffeinate command-line tool"\n';
const OTHER = '   pid 2000(zoom.us): [0x02] 00:10:00 PreventUserIdleDisplaySleep named: "Video Wake Lock"\n';

// The watcher calls ps once per iteration, so every stub answers from that iteration's directory.
const STUBS = {
  ps: String.raw`n=$(($(cat "$DIR/n") + 1)); echo $n > "$DIR/n"; [ -d "$DIR/$n" ] && cat "$DIR/lstart"; exit 0`,
  defaults: String.raw`cat "$DIR/$(cat "$DIR/n")/limit" 2>/dev/null`,
  ioreg: String.raw`printf '  | "HIDIdleTime" = %s000000000\n' "$(cat "$DIR/$(cat "$DIR/n")/idle")"`,
  pmset: String.raw`cat "$DIR/$(cat "$DIR/n")/pmset"`,
  pgrep: String.raw`[ -e "$DIR/$(cat "$DIR/n")/running" ]`,
  open: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/open.log"`,
  sleep: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/sleep.log"`,
};

function runWatcher(steps, started = "Wed Nov 5 09:15:52 2026") {
  const dir = mkdtempSync(join(tmpdir(), "coffee-screen-saver-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  writeFileSync(join(dir, "n"), "0");
  writeFileSync(join(dir, "lstart"), "Wed Nov  5 09:15:52 2026\n");
  steps.forEach(({ idle, limit, pmset = OWN, running }, index) => {
    const step = join(dir, String(index + 1));
    mkdirSync(step);
    writeFileSync(join(step, "idle"), String(idle));
    writeFileSync(join(step, "pmset"), pmset);
    if (limit !== undefined) writeFileSync(join(step, "limit"), String(limit));
    if (running) writeFileSync(join(step, "running"), "");
  });
  execFileSync("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", "200", started], {
    env: { PATH: `${bin}:/usr/bin:/bin`, DIR: dir },
    timeout: 10_000,
  });
  const lines = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8").trim().split("\n") : []);
  return { opened: lines("open.log"), slept: lines("sleep.log") };
}

for (const [preferences, watched] of [
  [{ allowScreenSaver: true }, true],
  [{ allowScreenSaver: true, preventDisplay: false }, false],
  [{ allowScreenSaver: false }, false],
]) {
  test(`screen saver watcher follows Coffee's caffeinate process: ${JSON.stringify(preferences)}`, async () => {
    const h = createHarness({ preferences });
    const watcher = Object.assign(new EventEmitter(), { unref: mock.fn() });
    h.processes.spawn.mock.mockImplementation((executable) => (executable === "/bin/sh" ? watcher : h.makeChild()));
    await h.load("utils.ts").startCaffeinate(quiet, undefined, "-t 300");
    const calls = h.processes.spawn.mock.calls.map(({ arguments: args }) => args);
    assert.equal(calls.length, watched ? 2 : 1);
    if (!watched) return;
    const [executable, args, options] = calls[1];
    assert.equal(executable, "/bin/sh");
    assert.deepEqual(Array.from(args), [
      "-c",
      SCREEN_SAVER_WATCHER,
      "coffee-screen-saver",
      "200",
      h.table.get(200).createdAt,
    ]);
    assert.equal(options.detached, true);
    assert.equal(options.env.TZ, "UTC");
    assert.equal(options.env.LC_ALL, "C");
    assert.equal(watcher.unref.mock.callCount(), 1);
  });
}

test("starts the screen saver once per idle period at the Lock Screen delay and exits with caffeinate", () => {
  const { opened, slept } = runWatcher([
    { idle: 590, limit: 600 },
    { idle: 600, limit: 600 },
    { idle: 640, limit: 600 },
    { idle: 2, limit: 600 },
    { idle: 600, limit: 600 },
  ]);
  assert.deepEqual(opened, [`2 ${OPEN}`, `5 ${OPEN}`]);
  assert.deepEqual(slept, ["1 10", "2 15", "3 15", "4 15", "5 15"]);
});

for (const [name, steps, opened] of [
  [
    "waits while another app prevents display sleep",
    [
      { idle: 700, limit: 600, pmset: OWN + OTHER },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "leaves an already running screen saver alone",
    [
      { idle: 600, limit: 600, running: true },
      { idle: 615, limit: 600 },
    ],
    [],
  ],
  ["never starts it when the Lock Screen delay is Never", [{ idle: 5000, limit: 0 }], []],
  ["uses the 20-minute macOS default when no delay is saved", [{ idle: 1199 }, { idle: 1200 }], [`2 ${OPEN}`]],
]) {
  test(`screen saver watcher ${name}`, () => {
    assert.deepEqual(runWatcher(steps).opened, opened);
  });
}

test("screen saver watcher exits at once when the PID belongs to a different process", () => {
  assert.deepEqual(runWatcher([{ idle: 600, limit: 600 }], "Thu Nov 6 09:15:52 2026"), { opened: [], slept: [] });
});
