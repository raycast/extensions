const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { EventEmitter, once } = require("node:events");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { mock, test } = require("node:test");
const { runInNewContext } = require("node:vm");
const { createHarness, loadSource, makeTempDir } = require("./helpers.cjs");

const { ACTIVE_ASSERTIONS, DECISION_SCRIPT, IDLE_TIME_SCRIPT, SCREEN_SAVER_WATCHER } = loadSource("screenSaver.ts", {});
const quiet = { menubar: false, status: false };
const OPEN = "-b com.apple.ScreenSaver.Engine";
const COFFEE = { pid: 200, type: "PreventUserIdleDisplaySleep" };
const DISPLAY_ON = { AssertType: "PreventUserIdleDisplaySleep", AssertLevel: 255 };
const UNLOCKED = {
  session: { kCGSSessionOnConsoleKey: true },
  displays: 1,
  assertions: { 200: [DISPLAY_ON] },
  delay: 600,
  idle: 700,
};
const posixShell = { skip: process.platform === "win32" && "needs /bin/sh" };
const macOS = { skip: process.platform !== "darwin" && "needs osascript" };

// Every stub answers from the current poll's directory. The sleep stub ends a poll and advances a fake wall clock.
const STUBS = {
  ps: String.raw`n=$(cat "$DIR/n"); echo "$n" >> "$DIR/ps.log"
[ -d "$DIR/$n" ] && [ ! -e "$DIR/$n/exit.$(grep -cx "$n" "$DIR/ps.log")" ] && cat "$DIR/lstart"; exit 0`,
  osascript: String.raw`n=$(cat "$DIR/n"); case "$*" in *IOPMCopyAssertionsByProcess*) file=decision ;; *) file=limit ;; esac
echo "$n $file" >> "$DIR/osascript.log"; cat "$DIR/$n/$file"`,
  ioreg: String.raw`n=$(cat "$DIR/n"); echo "$n" >> "$DIR/ioreg.log"
file="$DIR/$n/idle.$(grep -cx "$n" "$DIR/ioreg.log")"; [ -e "$file" ] || file="$DIR/$n/idle"
printf '  | "HIDIdleTime" = %s000000000\n' "$(cat "$file")"`,
  pgrep: String.raw`echo "$*" > "$DIR/pgrep.args"; exit $(cat "$DIR/$(cat "$DIR/n")/pgrep" 2>/dev/null || echo 1)`,
  open: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/open.log"`,
  date: String.raw`cat "$DIR/clock"`,
  sleep: String.raw`n=$(cat "$DIR/n"); echo "$n $*" >> "$DIR/sleep.log"
echo $(($(cat "$DIR/clock") + $1 + $(cat "$DIR/$n/drift" 2>/dev/null || echo 0))) > "$DIR/clock"
echo $((n + 1)) > "$DIR/n"`,
};

function runWatcher(steps, started = "Wed Nov 5 09:15:52 2026") {
  const dir = makeTempDir("coffee-screen-saver-");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  writeFileSync(join(dir, "n"), "1");
  writeFileSync(join(dir, "clock"), "1000");
  writeFileSync(join(dir, "lstart"), "Wed Nov  5 09:15:52 2026\n");
  let limit;
  steps.forEach(({ idle, recheck, decision, pgrep, drift, exits, ...step }, index) => {
    limit = step.limit ?? limit;
    const files = {
      idle,
      "idle.2": recheck,
      limit: step.limit,
      decision: decision === undefined ? `launch ${limit}` : decision,
      pgrep,
      drift,
      "exit.2": exits ? "" : undefined,
    };
    const poll = join(dir, String(index + 1));
    mkdirSync(poll);
    for (const [name, value] of Object.entries(files)) {
      if (value !== undefined && value !== null) writeFileSync(join(poll, name), `${value}\n`);
    }
  });
  execFileSync("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", "200", started], {
    env: {
      PATH: `${bin}:/usr/bin:/bin`,
      DIR: dir,
      COFFEE_IDLE_TIME: IDLE_TIME_SCRIPT,
      COFFEE_DECISION: DECISION_SCRIPT,
    },
    timeout: 10_000,
  });
  const lines = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8").trim().split("\n") : []);
  const polls = (script) =>
    lines("osascript.log")
      .filter((line) => line.endsWith(` ${script}`))
      .map((line) => line.split(" ")[0]);
  return {
    opened: lines("open.log"),
    slept: lines("sleep.log"),
    sampled: lines("ioreg.log"),
    decided: polls("decision"),
    read: polls("limit"),
    pgrep: lines("pgrep.args"),
  };
}

// Stands in for the JXA bridge so the whole decision script runs on any platform.
function decideWith(native) {
  const key = (value) => (typeof value === "object" && value !== null ? value.value : value);
  const wrap = (value) => ({
    value,
    isNil: () => value == null,
    objectForKey: (name) => wrap(value[key(name)]),
    get allKeys() {
      return wrap(Object.keys(value));
    },
    get count() {
      return value.length;
    },
    objectAtIndex: (index) => wrap(value[index]),
  });
  const $ = Object.assign((value) => value, {
    CGSessionCopyCurrentDictionary: () => native.session,
    CGGetActiveDisplayList: (max, list, count) => {
      count[0] = native.displays;
      return native.displayError ?? 0;
    },
    IOPMCopyAssertionsByProcess: (byPid) => {
      byPid[0] = native.assertions;
      return native.assertionError ?? 0;
    },
    CFPreferencesGetAppIntegerValue: (name, domain, valid) => {
      assert.deepEqual([name, domain], ["idleTime", "com.apple.screensaver"]);
      valid[0] = native.delay !== undefined;
      return native.delay ?? 0;
    },
    CGEventSourceSecondsSinceLastEventType: (source, type) => {
      assert.deepEqual([source, type], [0, 0xffffffff]);
      return native.idle;
    },
  });
  const ObjC = { import: () => {}, castRefToObject: wrap, unwrap: (object) => object.value };
  return runInNewContext(`${DECISION_SCRIPT}\nrun(argv);`, {
    $,
    ObjC,
    Ref: () => [],
    argv: ["com.apple.screensaver", "200"],
  });
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
    assert.equal(options.env.COFFEE_DECISION, DECISION_SCRIPT);
    assert.equal(watcher.unref.mock.callCount(), 1);
  });
}

test("keeps Coffee's session when the screen saver watcher can't start", async (t) => {
  const h = createHarness({ preferences: { allowScreenSaver: true } });
  const logged = t.mock.method(console, "error", () => {});
  h.processes.spawn.mock.mockImplementation((executable) => {
    if (executable === "/bin/sh") throw Object.assign(new Error("spawn E2BIG"), { code: "E2BIG" });
    return h.makeChild();
  });
  await h.load("utils.ts").startCaffeinate(quiet, undefined, "-t 300");
  assert.equal(h.table.has(200), true);
  assert.equal(JSON.parse(h.storage.get("caffeinationSession")).pid, 200);
  assert.equal(logged.mock.callCount(), 1);
});

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

test("screen saver watcher waits a full delay after macOS would skip the screen saver", posixShell, () => {
  const { opened, decided, slept } = runWatcher([
    { idle: 60, limit: 60, decision: "blocked 60" },
    { idle: 75 },
    { idle: 90 },
    { idle: 110 },
    { idle: 120 },
  ]);
  assert.deepEqual(decided, ["1", "5"]);
  assert.deepEqual(slept, ["1 15", "2 15", "3 15", "4 10", "5 15"]);
  assert.deepEqual(opened, [`5 ${OPEN}`]);
});

test("screen saver watcher stops waiting out a skipped screen saver after input", posixShell, () => {
  const { opened, decided } = runWatcher([
    { idle: 60, limit: 60, decision: "blocked 60" },
    { idle: 5 },
    { idle: 20 },
    { idle: 35 },
    { idle: 50 },
    { idle: 60 },
  ]);
  assert.deepEqual(decided, ["1", "6"]);
  assert.deepEqual(opened, [`6 ${OPEN}`]);
});

for (const [name, steps, opened] of [
  [
    "retries at the next check when the decision fails",
    [
      { idle: 700, limit: 600, decision: null },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "retries at the next check while Coffee's display assertion is missing",
    [
      { idle: 700, limit: 600, decision: "unowned 600" },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  [
    "retries at the next check while the session clock is short of the delay",
    [
      { idle: 700, limit: 600, decision: "active 600" },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  ["compares idle time with the delay the decision reads", [{ idle: 700, limit: 600, decision: "launch 900" }], []],
  ["rechecks idle time right before starting", [{ idle: 700, recheck: 3, limit: 600 }], []],
  ["fails closed until the Lock Screen delay can be read", [{ idle: 5000 }], []],
  [
    "leaves an already running screen saver alone",
    [
      { idle: 600, limit: 600, pgrep: 0 },
      { idle: 615, limit: 600 },
    ],
    [],
  ],
  [
    "retries when pgrep fails",
    [
      { idle: 600, limit: 600, pgrep: 3 },
      { idle: 615, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
  ["doesn't start the screen saver once caffeinate exits", [{ idle: 600, limit: 600, exits: true }], []],
  [
    "rearms after input while the delay was Never",
    [
      { idle: 700, limit: 600 },
      { idle: 715 },
      { idle: 730 },
      { idle: 745 },
      { idle: 760, limit: 0 },
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
  [
    "notices input between polls with a one-second delay",
    [{ idle: 1, limit: 1 }, { idle: 14 }],
    [`1 ${OPEN}`, `2 ${OPEN}`],
  ],
  [
    "rearms after input during a sleep that overran",
    [
      { idle: 10, limit: 10, drift: 20 },
      { idle: 30, limit: 10 },
    ],
    [`1 ${OPEN}`, `2 ${OPEN}`],
  ],
  [
    "keeps waiting out a skipped screen saver when the wall clock jumps",
    [{ idle: 600, limit: 600, decision: "blocked 600", drift: 30 }, { idle: 615 }],
    [],
  ],
  [
    "applies a shorter delay read while waiting out a skipped screen saver",
    [
      { idle: 1200, limit: 1200, decision: "blocked 1200" },
      { idle: 1215 },
      { idle: 1230 },
      { idle: 1245 },
      { idle: 1260, limit: 60 },
      { idle: 1275 },
    ],
    [`6 ${OPEN}`],
  ],
]) {
  test(`screen saver watcher ${name}`, posixShell, () => {
    assert.deepEqual(runWatcher(steps).opened, opened);
  });
}

test("screen saver watcher rereads the delay only on checks that don't decide", posixShell, () => {
  const { read, decided } = runWatcher([
    { idle: 100, limit: 600 },
    { idle: 115 },
    { idle: 130 },
    { idle: 145 },
    { idle: 700 },
    { idle: 715 },
    { idle: 730 },
    { idle: 745 },
    { idle: 760 },
  ]);
  assert.deepEqual({ read, decided }, { read: ["1", "9"], decided: ["5"] });
});

test("screen saver watcher skips idle sampling when the Lock Screen delay is Never", posixShell, () => {
  assert.deepEqual(runWatcher([{ idle: 5000, limit: 0 }]), {
    opened: [],
    slept: ["1 15"],
    sampled: [],
    decided: [],
    read: ["1"],
    pgrep: [],
  });
});

test("screen saver watcher exits at once when the PID belongs to a different process", posixShell, () => {
  const { opened, slept } = runWatcher([{ idle: 600, limit: 600 }], "Thu Nov 6 09:15:52 2026");
  assert.deepEqual({ opened, slept }, { opened: [], slept: [] });
});

const elsewhere = (row) => ({ 200: [DISPLAY_ON], 2000: [row] });

for (const [name, native, decision] of [
  ["starts when only Coffee keeps the display awake", {}, "launch 600"],
  [
    "ignores other apps' system-only assertions",
    { assertions: elsewhere({ AssertType: "PreventUserIdleSystemSleep", AssertLevel: 255 }) },
    "launch 600",
  ],
  [
    "ignores released and suspended display assertions",
    {
      assertions: {
        200: [DISPLAY_ON],
        2000: [
          { AssertType: "NoDisplaySleepAssertion", AssertLevel: 0 },
          { ...DISPLAY_ON, AssertionIsStateSuspended: true },
        ],
      },
    },
    "launch 600",
  ],
  [
    "waits for a Chromium or Firefox video (NoDisplaySleepAssertion)",
    { assertions: elsewhere({ AssertType: "NoDisplaySleepAssertion", AssertLevel: 255 }) },
    "blocked 600",
  ],
  ["waits for a Safari video (PreventUserIdleDisplaySleep)", { assertions: elsewhere(DISPLAY_ON) }, "blocked 600"],
  [
    "waits for a notification display wake",
    { assertions: elsewhere({ AssertType: "DisplayWake", AssertLevel: 255 }) },
    "blocked 600",
  ],
  [
    "waits while the screen is locked",
    { session: { kCGSSessionOnConsoleKey: true, CGSSessionScreenIsLocked: true } },
    "blocked 600",
  ],
  ["waits while no display is awake", { displays: 0 }, "blocked 600"],
  ["waits while another user is on the console", { session: { kCGSSessionOnConsoleKey: false } }, "blocked 600"],
  ["waits outside a login session", { session: null }, "blocked 600"],
  [
    "fails closed when Coffee's own display assertion is gone",
    { assertions: { 200: [{ AssertType: "PreventUserIdleSystemSleep", AssertLevel: 255 }] } },
    "unowned 600",
  ],
  [
    "fails closed when Coffee's own display assertion is released",
    { assertions: { 200: [{ ...DISPLAY_ON, AssertLevel: 0 }] } },
    "unowned 600",
  ],
  ["waits for the session clock to reach the delay", { idle: 599.9 }, "active 600"],
  ["never starts when the delay is Never", { delay: 0 }, "active 0"],
]) {
  test(`screen saver decision ${name}`, () => {
    assert.equal(decideWith({ ...UNLOCKED, ...native }), decision);
  });
}

test("screen saver decision fails, so the watcher retries, when macOS can't report its state", () => {
  assert.throws(() => decideWith({ ...UNLOCKED, displayError: 1000 }), /Cannot list displays/);
  assert.throws(() => decideWith({ ...UNLOCKED, assertionError: 1 }), /Cannot read power assertions/);
});

test("reads the Lock Screen delay the way loginwindow does", macOS, () => {
  const dir = makeTempDir("coffee-screen-saver-");
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

test("reads only active power assertions", macOS, () => {
  const script = `${ACTIVE_ASSERTIONS}
function run() {
  return JSON.stringify(activeAssertions($({
    200: [{ AssertType: "PreventUserIdleDisplaySleep", AssertLevel: 255 }],
    2000: [
      { AssertType: "NoDisplaySleepAssertion", AssertLevel: 0 },
      { AssertType: "PreventUserIdleDisplaySleep", AssertLevel: 255, AssertionIsStateSuspended: true },
      { AssertType: "DisplayWake", AssertLevel: 255, AssertionIsStateSuspended: false },
    ],
  })));
}`;
  const assertions = JSON.parse(execFileSync("osascript", ["-l", "JavaScript", "-e", script], { encoding: "utf8" }));
  assert.deepEqual(
    assertions.sort((a, b) => a.pid - b.pid),
    [COFFEE, { pid: 2000, type: "DisplayWake" }],
  );
});

test("decides from this Mac's session and power assertions", macOS, async (t) => {
  const caffeinate = spawn("/usr/bin/caffeinate", ["-d", "-t", "30"], { stdio: "ignore" });
  t.after(() => caffeinate.kill());
  await once(caffeinate, "spawn");
  const decide = (pid) =>
    execFileSync("osascript", ["-l", "JavaScript", "-e", DECISION_SCRIPT, "com.apple.screensaver", String(pid)], {
      encoding: "utf8",
    }).trim();
  // Any other process sees the test's caffeinate -d as another app keeping the display on, once it has registered.
  let other = decide(process.pid);
  for (let tries = 0; !other.startsWith("blocked ") && tries < 20; tries++) other = decide(process.pid);
  assert.match(other, /^blocked \d+$/);
  assert.match(decide(caffeinate.pid), /^(launch|active|blocked) \d+$/);
});
