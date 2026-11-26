const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { EventEmitter } = require("node:events");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { after, mock, test } = require("node:test");
const { createHarness, loadSource } = require("./helpers.cjs");

const { IDLE_TIME_SCRIPT, LAUNCH_STATE_SCRIPT, SCREEN_SAVER_WATCHER } = loadSource("screenSaver.ts", {});
const quiet = { menubar: false, status: false };
const OPEN = "-b com.apple.ScreenSaver.Engine";
const OWN = "200 PreventUserIdleDisplaySleep";
const ON_SCREEN = "session 1 0 1";
const posixShell = { skip: process.platform === "win32" && "needs /bin/sh" };
const macOS = { skip: process.platform !== "darwin" && "needs osascript" };

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "coffee-screen-saver-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// The watcher calls ps once per poll, so every stub answers from that poll's directory.
const STUBS = {
  ps: String.raw`n=$(($(cat "$DIR/n") + 1)); echo $n > "$DIR/n"; [ -d "$DIR/$n" ] && cat "$DIR/lstart"; exit 0`,
  osascript: String.raw`case "$*" in *idleTime*) file=limit ;; *) file=state ;; esac
cat "$DIR/$(cat "$DIR/n")/$file"`,
  ioreg: String.raw`n=$(cat "$DIR/n"); echo "$n" >> "$DIR/ioreg.log"
file="$DIR/$n/idle.$(grep -cx "$n" "$DIR/ioreg.log")"; [ -e "$file" ] || file="$DIR/$n/idle"
printf '  | "HIDIdleTime" = %s000000000\n' "$(cat "$file")"`,
  pgrep: String.raw`echo "$*" > "$DIR/pgrep.args"; [ -e "$DIR/$(cat "$DIR/n")/running" ]`,
  open: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/open.log"`,
  sleep: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/sleep.log"`,
};

function runWatcher(steps, started = "Wed Nov 5 09:15:52 2026") {
  const dir = tempDir();
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  writeFileSync(join(dir, "n"), "0");
  writeFileSync(join(dir, "lstart"), "Wed Nov  5 09:15:52 2026\n");
  steps.forEach(({ idle, recheck, limit, session = ON_SCREEN, assertions = OWN, running }, index) => {
    const step = join(dir, String(index + 1));
    mkdirSync(step);
    if (idle !== undefined) writeFileSync(join(step, "idle"), String(idle));
    if (recheck !== undefined) writeFileSync(join(step, "idle.2"), String(recheck));
    if (limit !== undefined) writeFileSync(join(step, "limit"), `${limit}\n`);
    if (assertions !== null) writeFileSync(join(step, "state"), `${session}\n${assertions}\n`);
    if (running) writeFileSync(join(step, "running"), "");
  });
  execFileSync("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", "200", started], {
    env: {
      PATH: `${bin}:/usr/bin:/bin`,
      DIR: dir,
      COFFEE_IDLE_TIME: IDLE_TIME_SCRIPT,
      COFFEE_LAUNCH_STATE: LAUNCH_STATE_SCRIPT,
    },
    timeout: 10_000,
  });
  const lines = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8").trim().split("\n") : []);
  return {
    opened: lines("open.log"),
    slept: lines("sleep.log"),
    sampled: lines("ioreg.log"),
    pgrep: lines("pgrep.args"),
  };
}

for (const [platform, preferences, spawned] of [
  ["darwin", { allowScreenSaver: true }, ["/usr/bin/caffeinate", "/bin/sh"]],
  ["darwin", { allowScreenSaver: true, preventDisplay: false }, ["/usr/bin/caffeinate"]],
  ["darwin", { allowScreenSaver: false }, ["/usr/bin/caffeinate"]],
  ["win32", { allowScreenSaver: true }, []],
]) {
  test(`screen saver watcher follows Coffee's session on ${platform}: ${JSON.stringify(preferences)}`, async () => {
    const h = createHarness({ platform, preferences });
    const watcher = Object.assign(new EventEmitter(), { unref: mock.fn() });
    h.processes.spawn.mock.mockImplementation((executable) => (executable === "/bin/sh" ? watcher : h.makeChild()));
    await h.load("utils.ts").startCaffeinate(quiet, undefined, "-t 300");
    const calls = h.processes.spawn.mock.calls.map(({ arguments: args }) => args);
    assert.deepEqual(
      calls.map(([executable]) => executable),
      spawned,
    );
    if (!spawned.includes("/bin/sh")) return;
    const [, args, options] = calls[1];
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
    assert.equal(options.env.COFFEE_IDLE_TIME, IDLE_TIME_SCRIPT);
    assert.equal(options.env.COFFEE_LAUNCH_STATE, LAUNCH_STATE_SCRIPT);
    assert.equal(watcher.unref.mock.callCount(), 1);
  });
}

test(
  "starts the screen saver once per idle period at the Lock Screen delay and exits with caffeinate",
  posixShell,
  () => {
    const { opened, slept, pgrep } = runWatcher([
      { idle: 590, limit: 600 },
      { idle: 600, limit: 600 },
      { idle: 640, limit: 600 },
      { idle: 2, limit: 600 },
      { idle: 600, limit: 600 },
    ]);
    assert.deepEqual(opened, [`2 ${OPEN}`, `5 ${OPEN}`]);
    assert.deepEqual(slept, ["1 10", "2 15", "3 15", "4 15", "5 15"]);
    assert.deepEqual(pgrep, [`-q -x -u ${process.getuid?.()} ScreenSaverEngine`]);
  },
);

for (const [name, steps, opened] of [
  [
    "waits for a Chromium or Firefox video (NoDisplaySleepAssertion)",
    [
      { idle: 700, limit: 600, assertions: `${OWN}\n2000 NoDisplaySleepAssertion` },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "waits for a Safari video (PreventUserIdleDisplaySleep)",
    [
      { idle: 700, limit: 600, assertions: `2000 PreventUserIdleDisplaySleep\n${OWN}` },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "waits for a notification display wake",
    [
      { idle: 700, limit: 600, assertions: `${OWN}\n2000 DisplayWake` },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "ignores other apps' system-only assertions",
    [{ idle: 700, limit: 600, assertions: `${OWN}\n2000 PreventUserIdleSystemSleep` }],
    [`1 ${OPEN}`],
  ],
  [
    "fails closed when the assertion query fails",
    [
      { idle: 700, limit: 600, assertions: null },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "fails closed when Coffee's own display assertion is gone",
    [{ idle: 700, limit: 600, assertions: "300 PreventUserIdleSystemSleep" }],
    [],
  ],
  ["waits while the screen is locked", [{ idle: 700, limit: 600, session: "session 1 1 1" }], []],
  ["waits while no display is awake", [{ idle: 700, limit: 600, session: "session 1 0 0" }], []],
  ["waits while another user is on the console", [{ idle: 700, limit: 600, session: "session 0 0 1" }], []],
  ["rechecks idle time right before starting", [{ idle: 700, recheck: 3, limit: 600 }], []],
  ["fails closed until the Lock Screen delay can be read", [{ idle: 5000 }], []],
  [
    "leaves an already running screen saver alone",
    [
      { idle: 600, limit: 600, running: true },
      { idle: 615, limit: 600 },
    ],
    [],
  ],
  [
    "rearms after input while the delay was Never",
    [
      { idle: 700, limit: 600 },
      { idle: 715 },
      { idle: 730 },
      { idle: 745 },
      { limit: 0 },
      {},
      {},
      {},
      { idle: 780, limit: 600 },
    ],
    [`1 ${OPEN}`, `9 ${OPEN}`],
  ],
  [
    "rearms after input between polls when the delay is shorter than a poll",
    [
      { idle: 10, limit: 10 },
      { idle: 14, limit: 10 },
    ],
    [`1 ${OPEN}`, `2 ${OPEN}`],
  ],
]) {
  test(`screen saver watcher ${name}`, posixShell, () => {
    assert.deepEqual(runWatcher(steps).opened, opened);
  });
}

test("screen saver watcher skips idle sampling when the Lock Screen delay is Never", posixShell, () => {
  assert.deepEqual(runWatcher([{ idle: 5000, limit: 0 }]), { opened: [], slept: ["1 15"], sampled: [], pgrep: [] });
});

test("screen saver watcher exits at once when the PID belongs to a different process", posixShell, () => {
  const { opened, slept } = runWatcher([{ idle: 600, limit: 600 }], "Thu Nov 6 09:15:52 2026");
  assert.deepEqual({ opened, slept }, { opened: [], slept: [] });
});

test("reads the Lock Screen delay the way loginwindow does", macOS, () => {
  const dir = tempDir();
  const read = (value) => {
    const domain = join(dir, `delay-${Math.random().toString(36).slice(2)}`);
    execFileSync("plutil", ["-create", "xml1", `${domain}.plist`]);
    if (value) execFileSync("plutil", ["-insert", "idleTime", ...value, `${domain}.plist`]);
    return execFileSync("osascript", ["-l", "JavaScript", "-e", IDLE_TIME_SCRIPT, domain], { encoding: "utf8" }).trim();
  };
  assert.equal(read(["-integer", "300"]), "300");
  assert.equal(read(["-string", "000"]), "0");
  assert.equal(read(["-string", "10:00"]), "1200");
  assert.equal(read(["-float", "300.5"]), "1200");
  assert.equal(read(), "1200");
});

test("reports the session and active power assertions", macOS, () => {
  const [session, ...rows] = execFileSync("osascript", ["-l", "JavaScript", "-e", LAUNCH_STATE_SCRIPT], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  assert.match(session, /^session [01] [01] \d+$/);
  for (const row of rows) assert.match(row, /^\d+ [A-Za-z]+$/);
});
