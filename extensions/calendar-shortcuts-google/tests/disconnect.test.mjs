import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

function harness() {
  const stores = new Map();
  const listeners = new Map();
  const launches = [];
  const trace = [];
  let tokens = { accessToken: "account-a" };
  let confirmed = true;
  let pendingSchedule;
  let scheduleCalls = 0;
  let deleteSettingsCalls = 0;
  const settings = { onlyMeetings: false, eventCount: 10, dateStyle: "day-month", rowLayout: "title-first" };
  const ui = new Proxy({}, { get: (_, key) => key });
  const api = {
    Cache: class {
      constructor({ namespace }) { this.name = namespace; if (!stores.has(namespace)) stores.set(namespace, new Map()); }
      get(key) { return stores.get(this.name).get(key); }
      set(key, value) { stores.get(this.name).set(key, value); for (const fn of listeners.get(this.name) || []) fn(key, value); }
      clear() { stores.get(this.name).clear(); }
      subscribe(fn) { const list = listeners.get(this.name) || new Set(); listeners.set(this.name, list); list.add(fn); return () => list.delete(fn); }
    },
    Icon: ui, Color: ui, MenuBarExtra: ui,
    Keyboard: { Shortcut: { Common: ui } },
    Action: { Style: ui }, ActionPanel: ui, List: ui,
    Alert: { ActionStyle: ui }, Toast: { Style: ui },
    LaunchType: { Background: "background", UserInitiated: "user" }, environment: { launchType: "background" },
    getPreferenceValues: () => ({ menuBarMode: "always", calendarSelectionMode: "all" }),
    launchCommand: async (options) => { trace.push("invalidate"); launches.push(options); },
    confirmAlert: async () => confirmed,
    showHUD: async () => {}, showToast: async () => {},
  };
  let active;
  const react = {
    useState(initial) { const i = active.index++; const owner = active; if (!(i in owner.state)) owner.state[i] = typeof initial === "function" ? initial() : initial; return [owner.state[i], (value) => { owner.state[i] = typeof value === "function" ? value(owner.state[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useCallback(fn) { return fn; }, useMemo(fn) { return fn(); },
    useEffect(fn) { if (active.first) active.effects.push(fn); },
  };
  const oauth = { client: {
    getTokens: async () => tokens,
    removeTokens: async () => { trace.push("remove-tokens"); tokens = null; },
  } };
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(Boolean) });
  const modules = {
    "@raycast/api": api, react,
    "@raycast/utils": { withAccessToken: () => (component) => component },
    "./lib/google-oauth": { googleOAuth: oauth },
    "./lib/calendar-settings": { deleteCurrentAccountCalendarSettings: async () => { trace.push("delete-settings"); deleteSettingsCalls++; } },
    "./event-actions": {},
    "./lib/google": { currentGoogleConnectionFingerprint: () => "account-a" },
    "./lib/calendar-settings-for-menu": { isCalendarSetupComplete: async () => true },
    "./lib/menu-bar-display-settings": { DEFAULT_MENU_BAR_DISPLAY_SETTINGS: settings, normaliseMenuBarDisplaySettings: (s) => s, readMenuBarDisplaySettings: async () => settings },
    "./lib/schedule": {
      loadSchedule: async () => { scheduleCalls++; return pendingSchedule; },
      isAllDay: () => false, eventStartMillis: (item) => Date.parse(item.event.start.dateTime), eventEndMillis: (item) => Date.parse(item.event.end.dateTime),
    },
    "node:crypto": { randomUUID: () => "disconnected-revision" },
  };
  function load(file, extra = "", overrides = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8") + extra, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: "h" },
    }).outputText;
    vm.runInNewContext(code, { exports, require: (name) => {
      if (name === "./lib/calendar-settings" && file === "src/menu-bar.tsx") return { isCalendarSetupComplete: async () => true };
      const all = { ...modules, ...overrides };
      assert.ok(name in all, `${file}: ${name}`);
      return all[name];
    }, h });
    return exports;
  }
  const session = load("src/lib/menu-bar-session.ts");
  modules["./lib/menu-bar-session"] = session;
  const menu = load("src/menu-bar.tsx", "\nexport { Command, SignedOutMenuBar };\n");
  const disconnectModule = load("src/disconnect-google.tsx");
  function mount(component, props = {}) {
    const owner = { state: [], effects: [], first: true };
    return {
      render() { active = owner; owner.index = 0; const tree = component(props); owner.first = false; return tree; },
      effects() { return owner.effects.splice(0).map((fn) => fn()); },
      state: owner.state,
    };
  }
  return { menu, disconnectGoogle: disconnectModule.disconnectGoogle, DisconnectCommand: disconnectModule.default, mount, launches, stores, session, trace,
    setTokens: (value) => { tokens = value; }, setConfirmed: (value) => { confirmed = value; },
    setSchedule: (value) => { pendingSchedule = value; }, scheduleCalls: () => scheduleCalls,
    deleteSettingsCalls: () => deleteSettingsCalls,
  };
}

function calendarSettingsHarness() {
  const storage = new Map();
  let account = { fingerprint: "fp-a", primaryId: "a@example.test" };
  const LocalStorage = {
  async getItem(key) { return storage.get(key); },
  async setItem(key, value) { storage.set(key, value); },
  async removeItem(key) { storage.delete(key); },
  async allItems() { return Object.fromEntries(storage.entries()); },
};
  const modules = {
    "@raycast/api": { LocalStorage },
    "./google": {
      currentGoogleConnectionFingerprint: () => account.fingerprint,
      listCalendars: async () => [{ id: account.primaryId, summary: account.primaryId, primary: true, accessRole: "owner" }],
    },
    "./types": {},
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/lib/calendar-settings.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; } });
  return {
    settings: exports,
    storage,
    useAccount(fingerprint, primaryId) { account = { fingerprint, primaryId }; },
  };
}

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const stale = { calendar: { id: "primary" }, event: { id: "old", summary: "Private stale event", start: { dateTime: "2099-09-14T12:00:00Z" }, end: { dateTime: "2099-09-14T13:00:00Z" } } };

test("Keep Settings disconnect removes OAuth tokens and stale menu data without deleting setup", async () => {
  const t = harness();
  t.stores.get("calendar-shortcuts-menu-bar").set("schedule-snapshot-v3:account-a", JSON.stringify({ updatedAt: Date.now(), setupComplete: true, events: [stale] }));
  assert.equal(await t.disconnectGoogle("keep"), true);
  assert.equal(t.deleteSettingsCalls(), 0);
  assert.deepEqual(t.trace.slice(0, 2), ["remove-tokens", "invalidate"]);
  assert.equal(t.stores.get("calendar-shortcuts-menu-bar").size, 0);
  assert.equal(t.launches.at(-1).name, "menu-bar");
  assert.equal(t.launches.at(-1).type, "background");
});

test("Delete Settings removes account setup before OAuth tokens and clears stale menu data", async () => {
  const t = harness();
  t.stores.get("calendar-shortcuts-menu-bar").set("stale", "private events");
  assert.equal(await t.disconnectGoogle("delete"), true);
  assert.equal(t.deleteSettingsCalls(), 1);
  assert.deepEqual(t.trace.slice(0, 3), ["delete-settings", "remove-tokens", "invalidate"]);
  assert.equal(t.stores.get("calendar-shortcuts-menu-bar").size, 0);
});

test("Cancelling either disconnect option preserves connection, settings, and cached events", async () => {
  for (const mode of ["keep", "delete"]) {
    const t = harness(); t.setConfirmed(false);
    t.stores.get("calendar-shortcuts-menu-bar").set("stale", "events");
    assert.equal(await t.disconnectGoogle(mode), false);
    assert.equal(t.deleteSettingsCalls(), 0);
    assert.equal(t.session.menuBarSessionRevision(), "initial");
    assert.equal(t.stores.get("calendar-shortcuts-menu-bar").size, 1);
    assert.equal(t.launches.length, 0);
  }
});

test("Already disconnected clears stale snapshots without deleting account settings or authorizing", async () => {
  const t = harness(); t.setTokens(null);
  t.stores.get("calendar-shortcuts-menu-bar").set("stale", "private events");
  assert.equal(await t.disconnectGoogle("delete"), false);
  assert.equal(t.deleteSettingsCalls(), 0);
  assert.equal(t.stores.get("calendar-shortcuts-menu-bar").size, 0);
  assert.equal(t.launches.length, 1);
  assert.equal(t.scheduleCalls(), 0);
});

test("An event request completing after disconnect cannot restore memory or disk events", async () => {
  const t = harness();
  let finish;
  t.setSchedule(new Promise((resolve) => { finish = resolve; }));
  const child = t.mount(t.menu.Command);
  child.render(); child.effects(); await flush();
  assert.equal(t.scheduleCalls(), 1);
  await t.disconnectGoogle("keep");
  finish({ events: [stale] }); await flush();
  assert.equal(t.stores.get("calendar-shortcuts-menu-bar").size, 0);
  assert.ok(!JSON.stringify(child.state).includes("Private stale event"));
});

test("Disconnect command presents explicit Keep and Delete choices", () => {
  const source = fs.readFileSync(new URL("../src/disconnect-google.tsx", import.meta.url), "utf8");
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const command = pkg.commands.find((item) => item.name === "disconnect-google");
  assert.equal(command.mode, "view");
  assert.equal(command.title, "Disconnect Google Account");
  assert.ok(source.includes('title="Keep DayCal Settings"'));
  assert.ok(source.includes('title="Delete DayCal Settings"'));
  assert.ok(source.includes("Your Google Calendar events will not be deleted"));
  assert.ok(source.includes("does not revoke DayCal in your Google Account"));
  assert.ok(source.includes("Action.Style.Destructive"));
});

test("Deleting one account's DayCal setup leaves another account's setup intact", async () => {
  const t = calendarSettingsHarness();
  const s = t.settings;

  t.useAccount("fp-a", "a@example.test");
  await s.setScheduleEnabledCalendarIds(["a-primary"]);
  await s.setMenuBarEnabledCalendarIds(["a-primary"]);
  await s.setCalendarRoles({ personal: "a-primary" });
  await s.setRoutingKeywords({ shared: ["Jonah"] });
  await s.markCalendarSetupComplete();
  // Historical builds used unscoped v1 setup keys. A true Delete Settings
  // operation must not allow an old routing keyword to survive a reconnect.
  t.storage.set(
    "calendar-shortcuts.routing-keywords.v1",
    JSON.stringify({ shared: ["legacy-jonah"] }),
  );

  t.useAccount("fp-b", "b@example.test");
  await s.setScheduleEnabledCalendarIds(["b-primary"]);
  await s.setMenuBarEnabledCalendarIds(["b-primary"]);
  await s.setCalendarRoles({ personal: "b-primary" });
  await s.setRoutingKeywords({ shared: ["Alex"] });
  await s.markCalendarSetupComplete();

  t.useAccount("fp-a", "a@example.test");
  await s.deleteCurrentAccountCalendarSettings();
  assert.equal(
    t.storage.has("calendar-shortcuts.routing-keywords.v1"),
    false,
    "legacy routing keywords must be removed by Delete DayCal Settings",
  );

  // Reconnecting the deleted account with a new access-token fingerprint must
  // behave like a genuinely fresh DayCal account.
  t.useAccount("fp-a-new-token", "a@example.test");
  assert.equal(await s.getScheduleEnabledCalendarIds(), null);
  assert.equal(await s.getMenuBarEnabledCalendarIds(), null);
  assert.deepEqual({ ...(await s.getCalendarRoles()) }, {});
  assert.deepEqual({ ...(await s.getRoutingKeywords()) }, {});
  assert.equal(await s.isCalendarSetupComplete(), false);

  t.useAccount("fp-b", "b@example.test");
  assert.deepEqual(Array.from(await s.getScheduleEnabledCalendarIds()), ["b-primary"]);
  assert.deepEqual(Array.from(await s.getMenuBarEnabledCalendarIds()), ["b-primary"]);
  assert.deepEqual({ ...(await s.getCalendarRoles()) }, { personal: "b-primary" });
  assert.deepEqual(JSON.parse(JSON.stringify(await s.getRoutingKeywords())), { shared: ["alex"] });
  assert.equal(await s.isCalendarSetupComplete(), true);
});
