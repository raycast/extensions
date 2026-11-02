const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createLoader } = require("./helpers.cjs");

function loadModule(filename, api, platform = "win32", DateConstructor = Date) {
  return createLoader({ api, platform, Date: DateConstructor })(filename);
}

const LaunchType = { Background: "background", UserInitiated: "user" };

test("Windows refresh never launches the unavailable menu-bar command", async () => {
  const platform = loadModule("utils/platform.ts", {
    LaunchType,
    launchCommand: () => assert.fail("Menu-bar command launched on Windows"),
  });
  await platform.refreshMenuBar();
});

test("macOS refresh still launches the menu-bar command", async () => {
  const calls = [];
  const platform = loadModule(
    "utils/platform.ts",
    { LaunchType, launchCommand: async (options) => calls.push(options) },
    "darwin"
  );
  await platform.refreshMenuBar();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "index");
  assert.equal(calls[0].type, LaunchType.UserInitiated);
});

test("year progress uses the current date on each call, including a year rollover", () => {
  let now = new Date(2024, 11, 31, 12).getTime();
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  const progress = loadModule(
    "utils/progress.ts",
    { getPreferenceValues: () => ({ weekStartsOn: "1" }) },
    "win32",
    ClockDate
  );
  assert.equal(progress.getYearProgressNum(), 100);
  now = new Date(2025, 0, 1, 12).getTime();
  assert.equal(progress.getYearProgressNum(), 0);
});

for (const launchType of Object.values(LaunchType)) {
  test(`year command awaits its subtitle update and only shows a toast for a user launch (${launchType})`, async () => {
    let subtitle;
    const toasts = [];
    let finishUpdate;
    class ClockDate extends Date {
      constructor(...args) {
        super(...(args.length ? args : [2024, 5, 30, 12]));
      }
    }
    const command = loadModule(
      "show-year-progress.ts",
      {
        LaunchType,
        environment: { launchType },
        getPreferenceValues: () => ({ weekStartsOn: "1" }),
        // An existing custom selection must have no effect on the dedicated year command.
        LocalStorage: { getItem: () => assert.fail("Year command read the saved selection") },
        Toast: { Style: { Success: "success" } },
        showToast: async (toast) => toasts.push(toast),
        updateCommandMetadata: (metadata) => {
          subtitle = metadata.subtitle;
          return new Promise((resolve) => (finishUpdate = resolve));
        },
      },
      "win32",
      ClockDate
    ).default;
    let completed = false;
    const execution = command().then(() => (completed = true));
    await Promise.resolve();
    assert.equal(completed, false);
    assert.equal(toasts.length, 0);
    assert.equal(subtitle, "■■■■■□□□□□ 49%");
    finishUpdate();
    await execution;
    assert.equal(toasts.length, launchType === LaunchType.UserInitiated ? 1 : 0);
    if (toasts.length) assert.equal(toasts[0].message, subtitle);
  });
}
