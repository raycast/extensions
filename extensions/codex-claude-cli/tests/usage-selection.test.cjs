/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS and a mocked host loader. */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Run the actual selection and freshness implementations, with only host APIs stubbed.
function load(name) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(join(__dirname, "../src/lib", `${name}.ts`), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports: module.exports,
    module,
    require: (id) => {
      if (id === "./usage") return load("usage");
      if (id.startsWith("node:")) return require(id);
      return {};
    },
    Date,
    process,
    setTimeout,
    clearTimeout,
    Buffer,
    console,
  });
  return module.exports;
}
const { selectMenuBarWindow } = load("usage-selection");
const now = 1800000000000;
const window = (remainingPercent, overrides = {}) => ({
  id: "five_hour",
  title: "5-hour",
  durationMinutes: 300,
  usedPercent: 100 - remainingPercent,
  remainingPercent,
  resetsAt: now + 60000,
  ...overrides,
});
const state = (provider, remaining, overrides = {}) => ({
  provider,
  source: "live",
  data: { provider, fetchedAt: now, windows: [window(remaining)] },
  ...overrides,
});

test("automatic selects a fresh custom provider and explicit selection works", () => {
  const states = [state("claude", 70), state("codex", 50), state("custom-local", 20)];
  assert.equal(selectMenuBarWindow(states, undefined, "automatic", now).provider, "custom-local");
  assert.equal(selectMenuBarWindow(states, "codex", "automatic", now).window.remainingPercent, 50);
});

test("stale, failed, waiting, unavailable, old and future readings never contribute", () => {
  for (const overrides of [
    { source: "stale" },
    { source: "waiting" },
    { source: "unavailable" },
    { error: "refresh failed" },
    { data: { provider: "claude", fetchedAt: now - 300001, windows: [window(1)] } },
    { data: { provider: "claude", fetchedAt: now + 120000, windows: [window(1)] } },
  ]) {
    const invalid = state("claude", 1, overrides);
    assert.equal(selectMenuBarWindow([invalid, state("codex", 70)], undefined, "automatic", now).provider, "codex");
    assert.equal(selectMenuBarWindow([invalid], "claude", "automatic", now), undefined);
  }
});

test("expired or invalid windows are excluded even within fresh observations", () => {
  for (const invalid of [window(1, { resetsAt: now }), window(NaN), window(-1), window(101)]) {
    const observed = state("codex", 70);
    observed.data.windows.unshift(invalid);
    assert.equal(selectMenuBarWindow([observed], undefined, "automatic", now).window.remainingPercent, 70);
  }
});

test("window preference retains fallback for accounts without short-term quotas", () => {
  const observed = state("codex", 80);
  observed.data.windows = [window(80, { id: "weekly", title: "Weekly", durationMinutes: 10080 })];
  assert.equal(selectMenuBarWindow([observed], "codex", "short-term", now).window.id, "weekly");
  observed.data.windows.push(window(90));
  assert.equal(selectMenuBarWindow([observed], "codex", "short-term", now).window.id, "five_hour");
  assert.equal(selectMenuBarWindow([observed], "codex", "weekly", now).window.id, "weekly");
});

test("cache is eligible only while fresh; no reset timestamp is allowed", () => {
  const observed = state("claude", 40, { source: "cache" });
  delete observed.data.windows[0].resetsAt;
  assert.equal(selectMenuBarWindow([observed], undefined, "automatic", now).window.remainingPercent, 40);
  assert.equal(selectMenuBarWindow([], undefined, "automatic", now), undefined);
});

test("quota-only menu never mounts the history hook; normal menu retains it", () => {
  const code = ts.transpileModule(readFileSync(join(__dirname, "../src/cli-usage-menu-bar.tsx"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const usageOnly of [true, false]) {
    let historyReads = 0;
    const module = { exports: {} };
    const host = {
      Icon: new Proxy({}, { get: (_, name) => name }),
      MenuBarExtra: Object.assign(() => null, { Section: "section", Item: "item", Submenu: "submenu" }),
      getPreferenceValues: () => ({ usageOnly }),
      LocalStorage: {},
    };
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      Date,
      console,
      require: (id) => {
        if (id === "@raycast/api") return host;
        if (id === "@raycast/utils") return { useCachedState: (_, initial) => [initial] };
        if (id === "react")
          return { useEffect: () => {}, useMemo: (fn) => fn(), useState: (initial) => [initial, () => {}] };
        if (id === "react/jsx-runtime")
          return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
        if (id === "./hooks/use-chat-sessions")
          return {
            useChatSessions: () => {
              historyReads++;
              return { sessions: [] };
            },
          };
        if (id === "./hooks/use-usage")
          return { useUsage: () => ({ snapshot: undefined, isLoading: false, refresh() {} }) };
        if (id === "./lib/shortcuts") return { useShortcutStore() {}, shortcut() {} };
        if (id === "./lib/presentation") return new Proxy({}, { get: () => () => "icon" });
        if (id === "./lib/usage") return load("usage");
        if (id === "./lib/usage-selection") return load("usage-selection");
        throw Error(`Unexpected dependency: ${id}`);
      },
    });
    function mount(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(mount);
      if (typeof node.type === "function" && node.type !== host.MenuBarExtra) return mount(node.type(node.props));
      mount(node.props?.children);
    }
    mount(module.exports.default());
    assert.equal(historyReads, usageOnly ? 0 : 1);
  }
});

test("a parsed custom weekly window remains selectable when its session reset has passed", () => {
  const { parseCustomUsage } = load("custom-usage");
  const providers = parseCustomUsage(
    {
      version: 1,
      providers: [
        {
          name: "Example",
          updatedAt: new Date(now).toISOString(),
          windows: [
            { label: "5-hour", usedPercent: 99, resetAt: new Date(now - 1000).toISOString() },
            { label: "Weekly", usedPercent: 28, resetAt: new Date(now + 86400000).toISOString() },
          ],
        },
      ],
    },
    now,
  );
  const selected = selectMenuBarWindow(providers, undefined, "automatic", now);
  assert.equal(selected.window.title, "Weekly");
  assert.equal(selected.window.remainingPercent, 72);
  assert.equal(selectMenuBarWindow(providers, providers[0].provider, "weekly", now).window.remainingPercent, 72);
});

test("quota-only retains only connected Claude observations until each window resets", () => {
  const { refreshUsageState, isUsageStateFresh } = load("usage");
  const observed = state("claude", 40, { bridgeConnected: true });
  observed.data.fetchedAt = now - 600000;
  const aged = refreshUsageState(observed, now);
  assert.equal(isUsageStateFresh(aged, now), false);
  assert.equal(selectMenuBarWindow([aged], undefined, "automatic", now), undefined);
  assert.equal(selectMenuBarWindow([aged], undefined, "automatic", now, true).lastObserved, true);
  assert.equal(selectMenuBarWindow([aged], "claude", "automatic", now, true).window.remainingPercent, 40);
  assert.equal(selectMenuBarWindow([aged], undefined, "automatic", now + 60000, true), undefined);
  const weeklyReset = now + 86400000;
  const mixed = {
    ...aged,
    data: {
      ...aged.data,
      windows: [
        window(1, { resetsAt: now - 1 }),
        window(65, { id: "weekly", title: "Weekly", durationMinutes: 10080, resetsAt: weeklyReset }),
      ],
    },
  };
  for (const preference of ["automatic", "weekly"]) {
    const selected = selectMenuBarWindow([mixed], "claude", preference, now, true);
    assert.equal(selected.window.id, "weekly");
    assert.equal(selected.window.remainingPercent, 65);
    assert.equal(selected.lastObserved, true);
    assert.equal(selectMenuBarWindow([mixed], "claude", preference, weeklyReset, true), undefined);
  }
  for (const overrides of [
    { error: "failed" },
    { needsConnection: true },
    { bridgeConnected: false },
    { source: "unavailable" },
    { provider: "codex" },
    { provider: "custom-test" },
  ]) {
    assert.equal(selectMenuBarWindow([{ ...aged, ...overrides }], undefined, "automatic", now, true), undefined);
  }
  for (const fetchedAt of [NaN, 0, -1, now + 1]) {
    assert.equal(
      selectMenuBarWindow([{ ...aged, data: { ...aged.data, fetchedAt } }], undefined, "automatic", now, true),
      undefined,
    );
  }
  for (const resetsAt of [undefined, NaN, now]) {
    assert.equal(
      selectMenuBarWindow(
        [{ ...aged, data: { ...aged.data, windows: [window(40, { resetsAt })] } }],
        undefined,
        "automatic",
        now,
        true,
      ),
      undefined,
    );
  }
});

test("retained menu title is marked and launch failures produce actionable toasts", async () => {
  const module = { exports: {} };
  const failures = [];
  const code = ts.transpileModule(
    readFileSync(join(__dirname, "../src/cli-usage-menu-bar.tsx"), "utf8") +
      "\nexport { menuBarTitle, combinedMenuBarTitle, menuBarTooltip, openUsageCommand, openPromptCastCommand };",
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Date,
    require: (id) => {
      if (id === "@raycast/api")
        return {
          LaunchType: { UserInitiated: "user" },
          launchCommand: async () => {
            throw Error("Launch failed");
          },
        };
      if (id === "@raycast/utils")
        return { showFailureToast: async (error, options) => failures.push([error.message, options.title]) };
      if (id === "./lib/usage") return load("usage");
      return {};
    },
  });
  const api = module.exports;
  assert.equal(api.menuBarTitle(window(40), "remaining", "percentage", undefined, true), "~40%");
  assert.equal(api.menuBarTitle(window(40), "remaining", "reset", "1h", true), "~1h");
  assert.match(api.menuBarTooltip("claude", window(40), "remaining", [state("claude", 40)], true), /Last observed/);
  assert.equal(
    api.combinedMenuBarTitle(
      [
        { provider: "claude", window: window(40), lastObserved: true },
        { provider: "codex", window: window(70), lastObserved: false },
      ],
      "remaining",
      "percentage",
    ),
    "~40%   70%",
  );
  await api.openUsageCommand();
  await api.openPromptCastCommand("claude:test");
  assert.deepEqual(failures, [
    ["Launch failed", "Could Not Open Usage Viewer"],
    ["Launch failed", "Could Not Open PromptCast"],
  ]);
});
