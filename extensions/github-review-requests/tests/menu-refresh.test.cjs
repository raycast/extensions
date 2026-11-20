const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { api, reset } = require("./harness.cjs");
const { refreshMenuBar } = require("../src/attention/lib/menu-refresh.ts");

// Tests refresh without the quiet period they would otherwise have to sit out.
const NOW = 0;

beforeEach(() => {
  reset();
});

test("a settings change nudges the menu bar without the user refreshing it", async () => {
  const launches = [];
  api.launchCommand = async options => launches.push(options);
  await refreshMenuBar(NOW);
  assert.deepEqual(launches, [{ name: "actionablePullRequests", type: "background" }]);
});

test("a run of toggles waits for you to finish and refreshes once", async () => {
  let launches = 0;
  api.launchCommand = async () => launches++;

  refreshMenuBar(30);
  refreshMenuBar(30);
  refreshMenuBar(30);
  await refreshMenuBar(30);

  assert.equal(launches, 1, "the menu must not re-render under a click for every toggle");
});

test("the nudge holds off until the changes stop", async () => {
  const at = [];
  const started = Date.now();
  api.launchCommand = async () => at.push(Date.now() - started);

  await refreshMenuBar(40);
  assert.equal(at.length, 1);
  assert.ok(at[0] >= 35, `expected a quiet period before the launch, got ${at[0]}ms`);
});

test("changes arriving mid-launch still reach the menu", async () => {
  let launches = 0;
  let release;
  const firstStarted = new Promise(resolve => (release = resolve));
  api.launchCommand = async () => {
    launches++;
    if (launches === 1) {
      release();
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };

  const first = refreshMenuBar(NOW);
  await firstStarted;
  await Promise.all([refreshMenuBar(NOW), refreshMenuBar(NOW)]);
  await first;

  assert.equal(launches, 2, "one launch in flight, then a single one carrying the latest change");
});

test("a menu-bar command switched off in Raycast never breaks saving a setting", async () => {
  api.launchCommand = async () => {
    throw new Error("command is disabled");
  };
  await assert.doesNotReject(refreshMenuBar(NOW));
});

test("a failed launch does not wedge later refreshes", async () => {
  api.launchCommand = async () => {
    throw new Error("command is disabled");
  };
  await refreshMenuBar(NOW);

  const launches = [];
  api.launchCommand = async options => launches.push(options);
  await refreshMenuBar(NOW);
  assert.equal(launches.length, 1, "the in-flight guard must be released even when the launch threw");
});

test("a superseded nudge never leaves its caller waiting for good", async () => {
  api.launchCommand = async () => {};

  const superseded = refreshMenuBar(30);
  const latest = refreshMenuBar(30);

  await assert.doesNotReject(Promise.all([superseded, latest]));
});
