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

// Every stub answers from the current poll's directory, and the sleep stub ends the poll. Idle files hold milliseconds,
// "fail" makes that ioreg read fail, and uptime files hold one mach_absolute_time reading per line, read in turn.
const STUBS = {
  ps: String.raw`n=$(cat "$DIR/n"); echo "$n" >> "$DIR/ps.log"; echo "$n ps" >> "$DIR/calls.log"
[ -e "$DIR/$n/unknown" ] && exit 0
[ -e "$DIR/$n/fails" ] && echo "ps: malloc failed" >&2 && exit 1
[ -d "$DIR/$n" ] && [ ! -e "$DIR/$n/exit.$(grep -cx "$n" "$DIR/ps.log")" ] || exit 1
cat "$DIR/lstart"`,
  osascript: String.raw`n=$(cat "$DIR/n"); case "$*" in *IOPMCopyAssertionsByProcess*) file=decision ;; *) file=limit ;; esac
echo "$n $file" >> "$DIR/osascript.log"; echo "$n $file" >> "$DIR/calls.log"; cat "$DIR/$n/$file"`,
  ioreg: String.raw`n=$(cat "$DIR/n"); echo "$n" >> "$DIR/ioreg.log"; echo "$n ioreg" >> "$DIR/calls.log"
file="$DIR/$n/idle.$(grep -cx "$n" "$DIR/ioreg.log")"; [ -e "$file" ] || file="$DIR/$n/idle"
[ "$(cat "$file" 2>/dev/null)" = fail ] || printf '  | "HIDIdleTime" = %s000000\n' "$(cat "$file")"`,
  pgrep: String.raw`echo "$*" > "$DIR/pgrep.args"; echo "$(cat "$DIR/n") pgrep" >> "$DIR/calls.log"
exit $(cat "$DIR/$(cat "$DIR/n")/pgrep" 2>/dev/null || echo 1)`,
  open: String.raw`echo "$(cat "$DIR/n") $*" >> "$DIR/open.log"; echo "$(cat "$DIR/n") open" >> "$DIR/calls.log"`,
  time: String.raw`[ "$1" = -p ] && shift; poll="$DIR/$(cat "$DIR/n")"; echo "$(cat "$DIR/n")" >> "$DIR/time.log"
drift=$(cat "$poll/drift" 2>/dev/null || echo 0)
report=$(cat "$poll/report" 2>/dev/null); "$@"
[ -n "$report" ] && echo "$report" >&2 && exit
awk -v slept="$2" -v drift="$drift" 'BEGIN { printf "real %.2f\nuser 0.00\nsys 0.00\n", slept + drift }' >&2`,
  sleep: String.raw`n=$(cat "$DIR/n"); echo "$n $*" >> "$DIR/sleep.log"; echo $((n + 1)) > "$DIR/n"`,
  sysctl: String.raw`[ -e "$DIR/tbfrequency" ] || exit 1
case "$*" in *hw.tbfrequency*) echo 24000000; exit ;; esac
n=$(cat "$DIR/n"); echo "$n" >> "$DIR/sysctl.log"; [ -e "$DIR/$n/uptime" ] || exit 1
line=$(sed -n "$(grep -cx "$n" "$DIR/sysctl.log")p" "$DIR/$n/uptime"); [ -n "$line" ] || line=$(tail -n 1 "$DIR/$n/uptime")
echo "0 $line"`,
};

// A PID that can't exist, so a failed ps means caffeinate is gone.
function runWatcher(steps, { started = "Wed Nov 5 09:15:52 2026", pid = "2147483647", tbfrequency = false } = {}) {
  const dir = makeTempDir("coffee-screen-saver-");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  writeFileSync(join(dir, "n"), "1");
  writeFileSync(join(dir, "lstart"), "Wed Nov  5 09:15:52 2026\n");
  if (tbfrequency || steps.some(({ uptime }) => uptime !== undefined)) writeFileSync(join(dir, "tbfrequency"), "");
  const ms = (seconds) => (seconds === undefined || seconds === "fail" ? seconds : Math.round(seconds * 1000));
  let limit;
  steps.forEach(({ idle, recheck, decision, pgrep, drift, report, exits, unknown, fails, uptime, ...step }, index) => {
    limit = step.limit ?? limit;
    const files = {
      idle: ms(idle),
      "idle.2": ms(recheck),
      limit: step.limit,
      decision: decision === undefined ? `launch ${limit}` : decision,
      pgrep,
      drift,
      report,
      "exit.2": exits ? "" : undefined,
      unknown: unknown ? "" : undefined,
      fails: fails ? "" : undefined,
      uptime:
        uptime === undefined
          ? undefined
          : [uptime]
              .flat()
              .map((seconds) => ms(seconds) * 24000)
              .join("\n"),
    };
    const poll = join(dir, String(index + 1));
    mkdirSync(poll);
    for (const [name, value] of Object.entries(files)) {
      if (value !== undefined && value !== null) writeFileSync(join(poll, name), `${value}\n`);
    }
  });
  execFileSync("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", pid, started], {
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
    timed: lines("time.log"),
    calls: lines("calls.log"),
    clockReads: lines("sysctl.log"),
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
  ["notices input half a second into a poll", [{ idle: 10, limit: 10 }, { idle: 24.5 }], [`1 ${OPEN}`, `2 ${OPEN}`]],
  ["ignores a millisecond of rounding in idle time", [{ idle: 600, limit: 600 }, { idle: 614.999 }], [`1 ${OPEN}`]],
  [
    "rearms after input during a sleep that overran by exactly a whole delay",
    [
      { idle: 10, limit: 10, drift: 10 },
      { idle: 25.005, limit: 10 },
    ],
    [`1 ${OPEN}`, `2 ${OPEN}`],
  ],
  [
    "keeps waiting out a skipped screen saver through a shorter overrun",
    [{ idle: 600, limit: 600, decision: "blocked 600", drift: 30 }, { idle: 645 }],
    [],
  ],
  [
    "stops waiting out a skipped screen saver after input hidden by a sleep that overran by a whole delay",
    [{ idle: 600, limit: 600, decision: "blocked 600", drift: 600 }, { idle: 615 }],
    [`2 ${OPEN}`],
  ],
  [
    "falls back to the requested sleep when the timing report can't be read",
    [{ idle: 10, limit: 10, report: "real 35,00" }, { idle: 25 }],
    [`1 ${OPEN}`],
  ],
  [
    "applies a shorter delay read while waiting out a skipped screen saver",
    [
      { idle: 1200, limit: 1200, decision: "blocked 1200" },
      { idle: 1215 },
      { idle: 1230 },
      { idle: 1245 },
      { idle: 1260, limit: 60 },
    ],
    [`5 ${OPEN}`],
  ],
  [
    "applies a shorter delay as soon as it's read",
    [{ idle: 100, limit: 600 }, { idle: 115 }, { idle: 130 }, { idle: 145 }, { idle: 160, limit: 60 }],
    [`5 ${OPEN}`],
  ],
  [
    "waits a full delay after a blocker seen with a longer delay",
    [
      { idle: 120, limit: 60, decision: "blocked 300" },
      { idle: 135 },
      { idle: 300 },
      { idle: 420, decision: "launch 300" },
    ],
    [`4 ${OPEN}`],
  ],
  [
    "rechecks after the delay in force at the block when a longer delay is read while waiting",
    [
      { idle: 200, limit: 100, decision: "blocked 100" },
      { idle: 215 },
      { idle: 230 },
      { idle: 245 },
      { idle: 260, limit: 300 },
      { idle: 320, decision: "launch 300" },
    ],
    [`6 ${OPEN}`],
  ],
  [
    "waits a full delay from when the blocker was seen",
    [
      { idle: 60, limit: 60, decision: "blocked 60", recheck: 100 },
      { idle: 115 },
      { idle: 130 },
      { idle: 145 },
      { idle: 160 },
    ],
    [`5 ${OPEN}`],
  ],
  [
    "waits a full delay from the next check when the check after a blocker fails",
    [
      { idle: 60, limit: 60, decision: "blocked 60", recheck: "fail" },
      { idle: 75 },
      { idle: 90 },
      { idle: 105 },
      { idle: 120 },
      { idle: 135 },
    ],
    [`6 ${OPEN}`],
  ],
  [
    "waits a full delay after input during a decision that found a blocker",
    [
      { idle: 60, limit: 60, decision: "blocked 60", recheck: 20 },
      { idle: 35 },
      { idle: 50 },
      { idle: 60 },
      { idle: 75 },
      { idle: 80 },
    ],
    [`6 ${OPEN}`],
  ],
  [
    "keeps watching through a failed ownership check",
    [
      { idle: 700, limit: 600, unknown: true },
      { idle: 715, limit: 600 },
    ],
    [`2 ${OPEN}`],
  ],
]) {
  test(`screen saver watcher ${name}`, posixShell, () => {
    assert.deepEqual(runWatcher(steps).opened, opened);
  });
}

test("screen saver watcher sleeps until a sub-second remainder of the delay", posixShell, () => {
  const { slept, opened } = runWatcher([{ idle: 599.5, limit: 600 }, { idle: 600.5 }]);
  assert.deepEqual({ first: slept[0], opened }, { first: "1 1", opened: [`2 ${OPEN}`] });
});

test("screen saver watcher makes no further decisions after a launch with a one-second delay", posixShell, () => {
  const { decided } = runWatcher([
    { idle: 1, limit: 1, drift: 0.5 },
    { idle: 16.5, decision: "blocked 1", drift: 0.5 },
    { idle: 32, decision: "blocked 1", drift: 0.5 },
    { idle: 47.5, decision: "blocked 1" },
  ]);
  assert.deepEqual(decided, ["1"]);
});

test("screen saver watcher rereads the delay about once a minute with a short delay", posixShell, () => {
  const steps = Array.from({ length: 13 }, (_, index) => ({ idle: 5, limit: index ? undefined : 10 }));
  assert.deepEqual(runWatcher(steps).read, ["1", "13"]);
});

test("screen saver watcher gives up after 20 failed ownership checks in a row", posixShell, () => {
  const { slept, sampled } = runWatcher(Array.from({ length: 25 }, () => ({ idle: 700, limit: 600, unknown: true })));
  assert.deepEqual({ sleeps: slept.length, sampled }, { sleeps: 19, sampled: [] });
});

test("screen saver watcher keeps watching when ps fails while caffeinate still runs", posixShell, () => {
  const steps = [
    { idle: 700, limit: 600, fails: true },
    { idle: 715, limit: 600 },
  ];
  assert.deepEqual(runWatcher(steps, { pid: String(process.pid) }).opened, [`2 ${OPEN}`]);
  assert.deepEqual(runWatcher(steps).opened, []);
});

test("screen saver watcher times its sleep only while input would change something", posixShell, () => {
  const steps = [{ idle: 590, limit: 600 }, { idle: 600 }, { idle: 615 }, { idle: 2 }];
  assert.deepEqual(runWatcher(steps).timed, ["2", "3"]);
  const uptimes = [1000, 1010, 1025, 1040];
  assert.deepEqual(runWatcher(steps.map((step, index) => ({ ...step, uptime: uptimes[index] }))).timed, []);
});

test("screen saver watcher samples idle time last before starting the screen saver", posixShell, () => {
  const calls = runWatcher([{ idle: 600, limit: 600 }]).calls.filter((call) => call.startsWith("1 "));
  assert.deepEqual(calls.slice(calls.indexOf("1 decision") + 1), ["1 pgrep", "1 ps", "1 ioreg", "1 open"]);
});

test("screen saver watcher decides again when its last checks take a second", posixShell, () => {
  const { opened, decided } = runWatcher([
    { idle: 600, limit: 600, uptime: [1000, 1000, 1000, 1000, 1001] },
    { idle: 617, uptime: 1017 },
  ]);
  assert.deepEqual({ opened, decided }, { opened: [`2 ${OPEN}`], decided: ["1", "2"] });
});

test("screen saver watcher notices input hidden by a stall outside its sleep", posixShell, () => {
  const { opened } = runWatcher([
    { idle: 60, limit: 60, uptime: 1000 },
    { idle: 84, uptime: 1085 },
  ]);
  assert.deepEqual(opened, [`1 ${OPEN}`, `2 ${OPEN}`]);
});

test("screen saver watcher doesn't mistake a slow idle read for input", posixShell, () => {
  const { opened } = runWatcher([
    { idle: 600, limit: 600, uptime: 1000 },
    { idle: 620, uptime: [1015, 1020] },
    { idle: 635, uptime: 1035 },
  ]);
  assert.deepEqual(opened, [`1 ${OPEN}`]);
});

test("screen saver watcher allows a millisecond of rounding against the uptime", posixShell, () => {
  const run = (idle) =>
    runWatcher([
      { idle: 600, limit: 600, uptime: 1000 },
      { idle, uptime: 1015 },
    ]).opened;
  assert.deepEqual(run(614.999), [`1 ${OPEN}`]);
  assert.deepEqual(run(614.998), [`1 ${OPEN}`, `2 ${OPEN}`]);
});

test("screen saver watcher compares requested sleeps when the uptime can't be read", posixShell, () => {
  const { opened } = runWatcher([
    { idle: 600, limit: 600, uptime: 1000 },
    { idle: 615 },
    { idle: 2, uptime: 1032 },
    { idle: 600, uptime: 1630 },
  ]);
  assert.deepEqual(opened, [`1 ${OPEN}`, `4 ${OPEN}`]);
});

test("screen saver watcher stops reading the uptime on Macs that don't report it", posixShell, () => {
  const { clockReads, timed } = runWatcher([{ idle: 600, limit: 600 }, { idle: 615 }], { tbfrequency: true });
  assert.deepEqual({ clockReads, timed }, { clockReads: ["1"], timed: ["1", "2"] });
});

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
  const { opened, slept, sampled, decided, read, pgrep } = runWatcher([{ idle: 5000, limit: 0 }]);
  assert.deepEqual(
    { opened, slept, sampled, decided, read, pgrep },
    { opened: [], slept: ["1 15"], sampled: [], decided: [], read: ["1"], pgrep: [] },
  );
});

test("screen saver watcher exits at once when the PID belongs to a different process", posixShell, () => {
  const { opened, slept } = runWatcher([{ idle: 600, limit: 600 }], { started: "Thu Nov 6 09:15:52 2026" });
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
