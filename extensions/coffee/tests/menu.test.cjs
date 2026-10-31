const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createHarness } = require("./helpers.cjs");

async function menu(options = {}) {
  const h = createHarness({ preferences: { icon: "pot", hidenWhenDecaffeinated: true, ...options.preferences } });
  if (options.external) h.addProcess(900);
  if (options.legacy) h.addProcess(901, { createdAt: "Mon Jan 5 10:00:00 2026", args: "/usr/bin/caffeinate -u -dim" });
  if (options.coffee)
    await h
      .load("utils.ts")
      .startCaffeinate(
        { menubar: false, status: false },
        undefined,
        options.duration ? `-t ${options.duration}` : undefined,
      );
  const state = {
    data: await h.load("utils.ts").getCaffeinationState(),
    isLoading: Boolean(options.loading),
    error: options.error,
  };
  const optimisticStates = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect: () => {},
  };
  function MenuBarExtra() {}
  MenuBarExtra.Item = "MenuBarExtra.Item";
  MenuBarExtra.Section = "MenuBarExtra.Section";
  const Component = h.load("index.tsx", {
    react,
    "@raycast/api": { ...h.api, MenuBarExtra, Color: { PrimaryText: "primary" }, Icon: { Checkmark: "check" } },
    "@raycast/utils": {
      useCachedState: () => [options.cached ?? false, () => {}],
      useCachedPromise: () => ({
        ...state,
        revalidate: async () => {},
        mutate: async (operation, config) => {
          const previous = state.data;
          if (config?.optimisticUpdate) {
            state.data = config.optimisticUpdate(previous);
            optimisticStates.push(state.data);
          }
          try {
            await operation;
            state.data = await h.load("utils.ts").getCaffeinationState();
          } catch (error) {
            state.data = previous;
            throw error;
          }
        },
      }),
    },
  }).default;
  const render = () => Component({ launchType: "background", launchContext: { caffeinated: false } });
  const items = (tree) => {
    if (Array.isArray(tree)) return tree.flatMap(items);
    if (!tree || typeof tree !== "object") return [];
    return [...(tree.type === MenuBarExtra.Item ? [tree.props] : []), ...tree.children.flatMap(items)];
  };
  return { ...h, render, items, state, optimisticStates };
}

test("hide when decaffeinated hides only when no caffeination is detected", async () => {
  const empty = await menu();
  assert.equal(empty.render(), null);
  const external = await menu({ external: true });
  assert.ok(external.render());
  const owned = await menu({ coffee: true });
  assert.ok(owned.render());
});

test("external-only activity has a filled icon and an informational row without selecting any Coffee action", async () => {
  const h = await menu({ external: true });
  const tree = h.render();
  const items = h.items(tree);
  assert.equal(tree.props.icon.source, "pot-filled.svg");
  const external = items.find(({ title }) => title === "External caffeination");
  assert.equal(external.subtitle, "1 process");
  assert.equal(external.onAction, undefined);
  assert.equal(
    items.some(({ icon }) => icon === "check"),
    false,
  );
  assert.equal(items.find(({ title }) => title === "Stop Coffee Caffeination").onAction, undefined);
  assert.equal(items.find(({ title }) => title === "Until…").subtitle, undefined);
});

test("a managed custom timeout selects Until and supports a countdown", async () => {
  const h = await menu({ coffee: true, duration: 300 });
  const until = h.items(h.render()).find(({ title }) => title === "Until…");
  assert.equal(until.icon, "check");
  assert.match(until.subtitle, /remain/);
});

test("a managed preset selects its duration", async () => {
  const h = await menu({ coffee: true, duration: 600 });
  const items = h.items(h.render());
  assert.equal(items.find(({ title }) => title === "10 Minutes").icon, "check");
  assert.equal(items.find(({ title }) => title === "Until…").icon, undefined);
});

test("stopping Coffee in a mixed state leaves the external row and icon visible", async () => {
  const h = await menu({ coffee: true, external: true, duration: 300 });
  const stop = h.items(h.render()).find(({ title }) => title === "Stop Coffee Caffeination");
  await stop.onAction();
  const tree = h.render();
  const items = h.items(tree);
  assert.equal(tree.props.icon.source, "pot-filled.svg");
  assert.equal(
    items.some(({ title }) => title === "External caffeination"),
    true,
  );
  assert.equal(
    items.some(({ icon }) => icon === "check"),
    false,
  );
  assert.equal(items.find(({ title }) => title === "Stop Coffee Caffeination").onAction, undefined);
  assert.ok(h.table.has(900));
  assert.equal(h.optimisticStates[0].sessionId, null);
});

test("failed inspection stays visible as unavailable instead of claiming decaffeination", async () => {
  const h = await menu({ error: new Error("Inspection denied") });
  assert.ok(h.render());
  assert.deepEqual(
    h.items(h.render()).map(({ title }) => title),
    ["Caffeination status unavailable"],
  );
});

test("a failed stop preserves managed state and does not hide the icon", async () => {
  const h = await menu({ coffee: true });
  h.fakeProcess.kill.mock.mockImplementation(() => {
    throw new Error("Cannot stop");
  });
  await h
    .items(h.render())
    .find(({ title }) => title === "Stop Coffee Caffeination")
    .onAction();
  assert.equal(h.render().props.icon.source, "pot-filled.svg");
  assert.equal(h.state.data.isManaged, true);
  assert.equal(h.api.showToast.mock.calls[0].arguments[0].title, "Failed to decaffeinate");
});

test("a blocked schedule stop leaves the menu state untouched before optimistic mutation", async () => {
  const h = await menu({ coffee: true });
  const day = h.load("utils.ts").numberToDayString(new Date().getDay()).toLowerCase();
  h.storage.set(day, JSON.stringify({ day, from: "00:00", to: "23:59", IsManuallyDecafed: false, IsRunning: true }));
  await h
    .items(h.render())
    .find(({ title }) => title === "Stop Coffee Caffeination")
    .onAction();
  assert.equal(h.optimisticStates.length, 0);
  assert.equal(h.fakeProcess.kill.mock.calls.length, 0);
  assert.equal(h.state.data.isManaged, true);
  assert.equal(h.api.showToast.mock.calls[0].arguments[0].title, "Caffeination schedule running");
});

test("a stop preflight read failure receives normal menu failure feedback", async () => {
  const h = await menu({ coffee: true });
  h.api.LocalStorage.getItem.mock.mockImplementation(async () => {
    throw new Error("Storage unavailable");
  });
  await h
    .items(h.render())
    .find(({ title }) => title === "Stop Coffee Caffeination")
    .onAction();
  assert.equal(h.optimisticStates.length, 0);
  assert.equal(h.fakeProcess.kill.mock.calls.length, 0);
  assert.equal(h.api.showToast.mock.calls[0].arguments[0].title, "Failed to decaffeinate");
});

test("optimistically starting a replacement does not reuse the previous session identity", async () => {
  const h = await menu({ coffee: true, duration: 300 });
  const previousSessionId = h.state.data.sessionId;
  await h
    .items(h.render())
    .find(({ title }) => title === "10 Minutes")
    .onAction();
  assert.equal(h.optimisticStates[0].sessionId, null);
  assert.equal(h.optimisticStates[0].totalSeconds, 600);
  assert.ok(h.state.data.sessionId);
  assert.notEqual(h.state.data.sessionId, previousSessionId);
});

test("a relaunch renders the cached menu while the fresh scan is still loading", async () => {
  const h = await menu({ coffee: true, duration: 300, loading: true });
  const items = h.items(h.render());
  assert.ok(items.find(({ title }) => title === "Stop Coffee Caffeination").onAction);
  assert.ok(items.some(({ title }) => title === "10 Minutes"));
});

test("status changes only update row text and actions, never the set of rows", async () => {
  const titles = async (options) => {
    const h = await menu({ ...options, preferences: { hidenWhenDecaffeinated: false } });
    return h.items(h.render()).map(({ title }) => title);
  };
  const layouts = await Promise.all(
    [{}, { external: true }, { coffee: true }, { coffee: true, external: true }, { legacy: true }].map(titles),
  );
  for (const layout of layouts) assert.equal(layout.length, layouts[0].length);
  const subtitles = async (options) => {
    const h = await menu({ ...options, preferences: { hidenWhenDecaffeinated: false } });
    return h.items(h.render())[0].subtitle;
  };
  assert.equal(await subtitles({}), "None");
  assert.equal(await subtitles({ external: true }), "1 process");
  assert.deepEqual(
    layouts.map((layout) => layout[0]),
    [
      "External caffeination",
      "External caffeination",
      "External caffeination",
      "External caffeination",
      "Stop Likely Coffee Session…",
    ],
  );
});

test("a likely pre-update Coffee session gets its own confirmed stop item and is not counted as external", async () => {
  const h = await menu({ legacy: true, external: true });
  const items = h.items(h.render());
  assert.equal(
    items.some(({ title }) => title === "External caffeination"),
    false,
  );
  const legacy = items.find(({ title }) => title === "Stop Likely Coffee Session…");
  assert.equal(legacy.subtitle, "Started before update · 1 external");
  assert.equal(items.find(({ title }) => title === "Stop Coffee Caffeination").onAction, undefined);
  await legacy.onAction();
  assert.match(h.api.confirmAlert.mock.calls[0].arguments[0].message, /cannot confirm it started this process/);
  assert.equal(h.table.has(901), false);
  assert.ok(h.table.has(900));
  const after = h.items(h.render()).map(({ title }) => title);
  assert.equal(after.includes("Stop Likely Coffee Session…"), false);
  assert.equal(after[0], "External caffeination");
});

test("a cached snapshot never drives the icon or keeps Raycast from waiting for the fresh scan", async () => {
  const h = await menu({ coffee: true, loading: true, cached: false });
  const tree = h.render();
  assert.equal(tree.props.isLoading, true);
  assert.equal(tree.props.icon.source, "pot-empty.svg");
  h.state.isLoading = false;
  const fresh = h.render();
  assert.equal(fresh.props.isLoading, false);
  assert.equal(fresh.props.icon.source, "pot-filled.svg");
});

async function legacyStop(options) {
  const h = await menu({ legacy: true, ...options });
  if (options.schedule) {
    const day = h.load("utils.ts").numberToDayString(new Date().getDay()).toLowerCase();
    h.storage.set(day, JSON.stringify({ day, from: "00:00", to: "23:59", IsManuallyDecafed: false, IsRunning: true }));
    h.day = day;
  }
  if (options.declined) h.api.confirmAlert.mock.mockImplementation(async () => false);
  if (options.killFails)
    h.fakeProcess.kill.mock.mockImplementation(() => {
      throw new Error("Cannot stop");
    });
  await h
    .items(h.render())
    .find(({ title }) => title === "Stop Likely Coffee Session…")
    .onAction();
  return h;
}

test("declining the confirmation leaves the possibly unrelated process running", async () => {
  const h = await legacyStop({ declined: true });
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  assert.ok(h.table.has(901));
});

test("with no managed session, a running schedule blocks the stop unless the preference pauses it", async () => {
  const blocked = await legacyStop({ schedule: true });
  assert.equal(blocked.api.confirmAlert.mock.callCount(), 0);
  assert.equal(blocked.fakeProcess.kill.mock.callCount(), 0);
  assert.equal(blocked.api.showToast.mock.calls[0].arguments[0].title, "Caffeination schedule running");

  const paused = await legacyStop({ schedule: true, preferences: { decaffeinatePausesSchedules: true } });
  assert.equal(paused.table.has(901), false);
  const schedule = JSON.parse(paused.storage.get(paused.day));
  assert.equal(schedule.IsManuallyDecafed, true);
  assert.equal(schedule.IsRunning, false);
});

test("a failed stop restores the schedule it paused", async () => {
  const h = await legacyStop({ schedule: true, killFails: true, preferences: { decaffeinatePausesSchedules: true } });
  assert.ok(h.table.has(901));
  const schedule = JSON.parse(h.storage.get(h.day));
  assert.equal(schedule.IsManuallyDecafed, false);
  assert.equal(schedule.IsRunning, true);
  assert.equal(h.api.showToast.mock.calls[0].arguments[0].title, "Failed to stop caffeinate process");
});

test("with a managed session running, stopping the leftover never blocks or pauses the schedule", async () => {
  const h = await legacyStop({ schedule: true, coffee: true });
  assert.equal(h.table.has(901), false);
  assert.ok(h.table.has(200));
  const schedule = JSON.parse(h.storage.get(h.day));
  assert.equal(schedule.IsManuallyDecafed, false);
  assert.equal(schedule.IsRunning, true);
});
