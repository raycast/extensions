import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as refresh from "./refresh";
import * as itemCounts from "./item-counts";
import * as vaultSharing from "./vault-sharing";
import * as format from "./format";
import * as shortcuts from "./shortcuts";
import * as fillSequence from "./fill-sequence";
import * as keyPress from "./key-press";
import { Item, ItemDetail, PassCliError } from "./types";

type Element = { props: Record<string, unknown> };
type Component = (props: Record<string, unknown>) => Element;

// Run the real UI callbacks with Raycast services replaced; no account or clipboard access.
function loadView(
  file: string,
  services: Record<string, unknown>,
  globals: Record<string, unknown> = {},
): Record<string, Component> {
  const module = { exports: {} };
  const jsx = (_type: unknown, props: Element["props"]) => ({ props });
  const source = readFileSync(join(process.cwd(), "src/lib", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name: string) => {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name in services) return services[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    URL,
    Error,
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => undefined,
    process: { platform: "darwin", env: { PATH: "" } },
    console: { error: () => undefined },
    ...globals,
  });
  return module.exports;
}

function actions(element: unknown): Element["props"][] {
  if (!element || typeof element !== "object" || !("props" in element)) return [];
  const props = (element as Element).props;
  return [props, ...[props.children].flat().flatMap(actions)];
}

test("autofill keeps the original external target when closing changes focus and rejects Raycast", async () => {
  const externalApp = { name: "Example", bundleId: "com.example.app" };
  const otherApp = { name: "Other", bundleId: "com.example.other" };
  const raycast = { name: "Raycast", bundleId: "com.raycast.macos" };
  for (const initialApp of [externalApp, raycast, undefined]) {
    let frontmostApp: typeof externalApp | undefined = initialApp;
    const { getTargetApp } = loadView("autofill.ts", {
      "@raycast/api": {
        PopToRootType: { Suspended: "suspended" },
        closeMainWindow: async () => {
          frontmostApp = otherApp;
        },
        getFrontmostApplication: async () => frontmostApp,
      },
      "@raycast/utils": {},
      "./fill-sequence": fillSequence,
      "./key-press": keyPress,
    }) as unknown as { getTargetApp: () => Promise<typeof externalApp> };
    if (initialApp === externalApp) {
      const target = await getTargetApp();
      assert.equal(target.bundleId, externalApp.bundleId);
      assert.equal(target.name, externalApp.name);
    } else {
      await assert.rejects(getTargetApp(), /Couldn't find the app to fill/);
    }
  }
});

const item: Item = {
  shareId: "vault",
  itemId: "login",
  title: "Example",
  type: "login",
  vaultName: "Personal",
  hasTotp: false,
  hasPassword: true,
  email: "test@example.com",
};

function itemActions(primaryAction?: "details" | "copy" | "fill", selectedItem: Item = item, detail?: ItemDetail) {
  const events: string[] = [];
  const fills: { values: string[]; target: unknown }[] = [];
  const contents: string[] = [];
  const { ItemActions } = loadView("item-actions.tsx", {
    react: { memo: (component: Component) => component },
    "@raycast/api": {
      Action: {},
      ActionPanel: {},
      Icon: {},
      Toast: { Style: {} },
      Keyboard: {
        Shortcut: {
          Common: {
            CopyName: {
              macOS: { modifiers: ["cmd", "shift"], key: "." },
              Windows: { modifiers: ["ctrl", "alt"], key: "c" },
            },
          },
        },
      },
      getPreferenceValues: () => ({ primaryAction }),
      Clipboard: {
        copy: async (value: string) => {
          contents.push(value);
          events.push("copy");
        },
      },
      showToast: async () => undefined,
    },
    "./autofill": {
      canFillFrontmostApp: true,
      getTargetApp: async () => {
        events.push("target");
        return { name: "Example", bundleId: "com.example.app" };
      },
      fillApp: async (target: unknown, request: { values: string[] }) => {
        events.push("fill");
        fills.push({ ...request, target });
      },
    },
    "./format": { websiteLabels: () => [] },
    "./item-view": {},
    "./note-view": {},
    "./shortcuts": shortcuts,
    "./use-totp-code": {},
  });
  const panel = ItemActions({
    item: selectedItem,
    detail,
    store: {
      peek: () => {
        if (primaryAction === "fill") events.push("load");
        return detail ?? { ...selectedItem, password: "fake-secret" };
      },
    },
    isShowingDetail: true,
    onToggleDetail: () => undefined,
    onUse: () => events.push("use"),
  });
  return { entries: actions(panel), events, fills, contents };
}

test("Enter views details by default and copies or fills only when selected in preferences", async () => {
  const titles = (entries: Element["props"][]) => entries.filter((entry) => entry.title).map((entry) => entry.title);
  assert.equal(titles(itemActions().entries)[0], "View Details");
  const { entries, events } = itemActions("copy");
  assert.equal(titles(entries)[0], "Copy Password");
  await (entries.find((entry) => entry.title === "Copy Password")?.onAction as () => Promise<void>)();
  assert.deepEqual(events, ["copy", "use"]);
  const stale = itemActions("copy", { ...item, hasPassword: false });
  assert.equal(titles(stale.entries)[0], "View Details");
  const explicitCopy = stale.entries.find((entry) => entry.title === "Copy Password");
  assert.ok(explicitCopy);
  await (explicitCopy.onAction as () => Promise<void>)();
  assert.deepEqual(stale.events, ["copy", "use"]);
  assert.equal(titles(itemActions("copy", { ...item, type: "credit_card" }).entries)[0], "View Details");
  assert.equal(titles(itemActions("copy", { ...item, type: "note" }).entries)[0], "Show Note");
  const addedPassword = { ...item, password: "fake-secret" };
  assert.equal(titles(itemActions("copy", { ...item, hasPassword: false }, addedPassword).entries)[0], "Copy Password");
  assert.equal(titles(itemActions("copy", item, { ...item, password: undefined }).entries)[0], "View Details");

  const filling = itemActions("fill");
  assert.equal(titles(filling.entries)[0], "Fill Login");
  await (filling.entries.find((entry) => entry.title === "Fill Login")?.onAction as () => Promise<void>)();
  assert.deepEqual(Array.from(filling.fills[0].values), [item.email, "fake-secret"]);
  assert.deepEqual(filling.events, ["target", "load", "use", "fill"]);
  assert.equal((filling.fills[0].target as { bundleId: string }).bundleId, "com.example.app");
  assert.equal(titles(itemActions("fill", { ...item, hasPassword: false }).entries)[0], "View Details");
  assert.ok(titles(itemActions("fill", { ...item, hasPassword: false }).entries).includes("Paste Email"));
});

test("copying and pasting item fields uses loaded values and omits fields removed since the cached listing", async () => {
  const loaded = { ...item, username: "new-user", email: "new@example.com", title: "New title" };
  const { entries, contents, fills } = itemActions(undefined, item, loaded);
  const pasteUsername = entries.find((entry) => entry.title === "Paste Username");
  assert.ok(pasteUsername);
  await (pasteUsername.onAction as () => Promise<void>)();
  assert.deepEqual(Array.from(fills[0].values), [loaded.username]);
  for (const title of ["Copy Username", "Copy Email", "Copy Title"]) {
    await (entries.find((entry) => entry.title === title)!.onAction as () => Promise<void>)();
  }
  assert.deepEqual(contents, [loaded.username, loaded.email, loaded.title]);
  const removed = itemActions(
    undefined,
    { ...item, username: "old-user" },
    { ...item, username: undefined, email: undefined },
  );
  assert.equal(
    removed.entries.some((entry) =>
      ["Copy Username", "Copy Email", "Paste Username", "Paste Email"].includes(String(entry.title)),
    ),
    false,
  );
});

test("Copy Email and Copy Title have distinct Windows shortcuts", () => {
  const { entries } = itemActions();
  const shortcut = (title: string) =>
    (entries.find((entry) => entry.title === title)?.shortcut as { Windows: unknown }).Windows;
  assert.notEqual(JSON.stringify(shortcut("Copy Email")), JSON.stringify(shortcut("Copy Title")));
});

test("Show Note copying follows the Transient Clipboard preference and conceals by default", () => {
  for (const copyPasswordTransient of [undefined, true, false]) {
    const { NoteView } = loadView("note-view.tsx", {
      "@raycast/api": {
        Action: {},
        ActionPanel: {},
        Detail: {},
        getPreferenceValues: () => ({ copyPasswordTransient }),
      },
      "@raycast/utils": { usePromise: () => ({ data: { note: "fake note" }, isLoading: false }) },
      "./format": format,
    });
    const view = NoteView({ item: { ...item, type: "note" }, store: {} });
    const copy = actions(view.props.actions).find((entry) => entry.title === "Copy Note");
    assert.equal(copy?.content, "fake note");
    assert.equal(copy?.concealed, copyPasswordTransient ?? true);
  }
});

function hookHarness() {
  const slots: unknown[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const cell = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return index;
  };
  return {
    effects,
    render(component: Component, props: Record<string, unknown>) {
      cursor = 0;
      return component(props);
    },
    react: {
      useState: (initial: unknown) => {
        const index = cell(initial);
        return [
          slots[index],
          // Like React, an updater function receives the current value.
          (value: unknown) => {
            slots[index] = typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
      useRef: (initial: unknown) => slots[cell({ current: initial })],
      useMemo: (factory: () => unknown, deps: unknown[]) => {
        const index = cursor++;
        const previous = slots[index] as { deps: unknown[]; value: unknown } | undefined;
        if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) slots[index] = { deps, value: factory() };
        return (slots[index] as { value: unknown }).value;
      },
      useEffect: (effect: () => void) => {
        const index = cell(false);
        if (slots[index] === false) {
          effects.push(effect);
          slots[index] = true;
        }
      },
    },
  };
}

test("a failed full load keeps early vault items visible and offers a working Retry", async () => {
  const harness = hookHarness();
  const toasts: { title: string; message: string; primaryAction: { onAction: () => void } }[] = [];
  let calls = 0;
  const { SearchItemsView } = loadView("search-items-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Dropdown: { Section: {}, Item: {} } },
      Icon: {},
      getPreferenceValues: () => ({}),
      Toast: { Style: { Failure: "failure" } },
      showToast: async (toast: (typeof toasts)[number]) => {
        toasts.push(toast);
      },
    },
    "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
    "./pass-cli": {
      listItems: async () => [item],
      listVaultsAndItems: async () => {
        calls++;
        throw new PassCliError("Network unavailable", "network_error");
      },
    },
    "./types": { PassCliError },
    "./cache": { getCachedItems: async () => null, getCachedVaults: async () => null },
    "./error-views": { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) },
    "./login-view": {},
    "./format": {},
    "./item-list": {},
    "./refresh": refresh,
    "./item-counts": itemCounts,
    "./vault-sharing": vaultSharing,
  });
  const render = () => {
    return harness.render(SearchItemsView, { initialVault: { shareId: "vault", name: "Personal" } });
  };
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.deepEqual(render().props.items, [item]);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].title, "Couldn't Load Items");
  assert.equal(toasts[0].message, "Network unavailable");
  assert.equal(calls, 1);
  toasts[0].primaryAction.onAction();
  await new Promise(setImmediate);
  assert.equal(calls, 2);
  assert.deepEqual(render().props.items, [item]);
});

test("item-list authentication failures clear saved session metadata on both listing paths", async () => {
  let clears = 0;
  const vault = { shareId: "vault", name: "Personal" };
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":" },
    "./cache": {
      clearCache: async () => {
        clears++;
      },
    },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => ({
        listVaults: async () => [vault],
        listItems: async () => {
          throw new PassCliError("Session ended", "not_authenticated");
        },
      }),
    },
    "./core/login": {},
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as {
    listItems: (id: string, vaults: unknown[]) => Promise<unknown>;
    listVaultsAndItems: () => Promise<unknown>;
  };
  await assert.rejects(api.listItems("vault", [vault]), /Session ended/);
  await assert.rejects(api.listVaultsAndItems(), /Session ended/);
  assert.equal(clears, 2);
});

test("only the user's own vaults have their members counted, to know whether they're shared", async () => {
  const counted: string[] = [];
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":" },
    "./cache": {},
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => ({
        listVaultRoles: async () =>
          new Map([
            ["personal", "owner"],
            ["family", "owner"],
            ["work", "viewer"],
            ["offline", "owner"],
          ]),
        countVaultMembers: async (shareId: string) => {
          counted.push(shareId);
          if (shareId === "offline") throw new PassCliError("Network unavailable", "network_error");
          return shareId === "family" ? 3 : 1;
        },
      }),
    },
    "./core/login": {},
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as { listVaultSharing: () => Promise<Map<string, unknown>> };

  const sharing = await api.listVaultSharing();
  assert.deepEqual(counted.sort(), ["family", "offline", "personal"]);
  // A vault whose members couldn't be counted isn't known to be shared, or not.
  assert.deepEqual(JSON.parse(JSON.stringify([...sharing])), [
    ["personal", { role: "owner", isShared: false }],
    ["family", { role: "owner", isShared: true }],
    ["work", { role: "viewer", isShared: true }],
    ["offline", { role: "owner" }],
  ]);
});

test("opening a vault offline preserves its earlier per-vault item cache", async () => {
  const other = { ...item, shareId: "other" };
  const newer = { ...item, itemId: "new", title: "Newer saved login" };
  const deleted = { ...item, itemId: "deleted", title: "Deleted login" };
  const now = Date.now();
  const cases = [
    { shared: undefined, legacy: [item], sharedTime: now, legacyTime: now, expected: [item] },
    { shared: [other], legacy: [item], sharedTime: now, legacyTime: now, expected: [item] },
    {
      shared: [deleted, other],
      legacy: [item, newer],
      sharedTime: now - 1000,
      legacyTime: now,
      expected: [item, newer],
    },
    { shared: [newer, other], legacy: [deleted], sharedTime: now, legacyTime: now - 1000, expected: [newer] },
    { shared: [deleted, other], legacy: [], sharedTime: now - 1000, legacyTime: now, expected: [] },
  ];
  for (const scenario of cases) {
    const vault = { shareId: "vault", name: "Personal" };
    const saved = new Map([
      ["proton_pass_items_cache_vault", JSON.stringify({ data: scenario.legacy, timestamp: scenario.legacyTime })],
    ]);
    if (scenario.shared)
      saved.set("proton_pass_items_cache", JSON.stringify({ data: scenario.shared, timestamp: scenario.sharedTime }));
    const cache = loadView("cache.ts", {
      "@raycast/api": {
        getPreferenceValues: () => ({}),
        LocalStorage: { getItem: async (key: string) => saved.get(key) },
      },
    });
    const harness = hookHarness();
    const { SearchItemsView } = loadView("search-items-view.tsx", {
      react: harness.react,
      "@raycast/api": {
        List: { Dropdown: { Section: {}, Item: {} } },
        Icon: {},
        getPreferenceValues: () => ({ enableBackgroundRefresh: false }),
        Toast: { Style: {} },
        showToast: async () => undefined,
      },
      "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
      "./pass-cli": {
        listItems: async () => {
          throw new PassCliError("Offline", "network_error");
        },
        listVaultsAndItems: async () => {
          throw new PassCliError("Offline", "network_error");
        },
      },
      "./types": { PassCliError },
      "./cache": cache,
      "./error-views": { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) },
      "./login-view": {},
      "./format": {},
      "./item-list": {},
      "./refresh": refresh,
      "./item-counts": itemCounts,
      "./vault-sharing": vaultSharing,
    });
    const render = () => harness.render(SearchItemsView, { initialVault: vault });
    render();
    harness.effects.forEach((effect) => effect());
    await new Promise(setImmediate);
    assert.deepEqual(
      Array.from((render().props.items as Item[] | undefined) ?? [], ({ itemId }) => itemId),
      scenario.expected.map(({ itemId }) => itemId),
    );
  }
});

test("failed vault loads remain retryable and never write a fresh empty cache", async () => {
  const harness = hookHarness();
  let calls = 0;
  let writes = 0;
  const { SearchItemsView } = loadView("search-items-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Dropdown: { Section: {}, Item: {} } },
      Icon: {},
      getPreferenceValues: () => ({}),
      Toast: { Style: {} },
      showToast: async () => undefined,
    },
    "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
    "./pass-cli": {
      listVaultsAndItems: async () => {
        calls++;
        return {
          vaults: [{ shareId: "vault", name: "Personal" }],
          items: [],
          failedVaults: [{ vault: { shareId: "vault", name: "Personal" }, message: "Offline" }],
        };
      },
    },
    "./types": { PassCliError },
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      setCachedItems: async () => {
        writes++;
      },
      setCachedVaults: async () => {
        writes++;
      },
    },
    "./error-views": {
      renderErrorView: (type: unknown, onRetry: unknown, _title: unknown, message: unknown) =>
        type ? { props: { error: type, onRetry, message } } : null,
    },
    "./login-view": {},
    "./format": {},
    "./item-list": {},
    "./refresh": refresh,
    "./item-counts": itemCounts,
    "./vault-sharing": vaultSharing,
  });
  const render = () => harness.render(SearchItemsView, {});
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(writes, 0);
  assert.equal(render().props.error, "unknown");
  assert.equal(render().props.message, "Offline");
  await (render().props.onRetry as () => Promise<void>)();
  assert.equal(calls, 2);
  assert.equal(writes, 0);
});

test("hiding item details stops automatic secret loads while showing them selects the item", () => {
  for (const isShowingDetail of [false, true]) {
    let requested: Item | undefined;
    const { ItemList } = loadView("item-list.tsx", {
      "@raycast/api": {
        List: { Item: {}, Section: {}, EmptyView: {} },
        Icon: {},
        Image: { Mask: {} },
        getPreferenceValues: () => ({}),
      },
      "@raycast/utils": {
        useCachedState: () => [isShowingDetail, () => undefined],
        useFrecencySorting: (items: Item[]) => ({ data: items, visitItem: () => undefined }),
      },
      react: {
        useMemo: (factory: () => unknown) => factory(),
        useState: () => [undefined, () => undefined],
        useRef: (value: unknown) => ({ current: value }),
        useCallback: (callback: unknown) => callback,
      },
      "./avatar": { getInitialIconDataUri: () => "" },
      "./format": format,
      "./item-actions": {},
      "./item-detail-panel": {},
      "./item-detail-store": {
        ItemDetailStore: class {
          peek() {
            return undefined;
          }
        },
        useItemDetail: (_store: unknown, selected: Item | undefined) => {
          requested = selected;
          return { isLoading: false };
        },
      },
      "./utils": { getItemIcon: () => "" },
    });
    const list = ItemList({ items: [item], isLoading: false, emptyView: {} });
    const row = (list.props.children as Element[])[0];
    assert.equal(Boolean(row.props.detail), isShowingDetail);
    assert.equal(requested, isShowingDetail ? item : undefined);
  }
});

function loadItemList() {
  const harness = hookHarness();
  const state: { requested?: Item } = {};
  const { ItemList } = loadView("item-list.tsx", {
    react: { ...harness.react, useCallback: (callback: unknown) => callback },
    "@raycast/api": {
      List: { Item: {}, Section: {}, EmptyView: {} },
      Icon: {},
      Image: { Mask: {} },
      getPreferenceValues: () => ({}),
    },
    "@raycast/utils": {
      useCachedState: () => [true, () => undefined],
      useFrecencySorting: (items: Item[]) => ({ data: items, visitItem: () => undefined }),
    },
    "./avatar": { getInitialIconDataUri: () => "" },
    "./format": format,
    "./item-actions": {},
    "./item-detail-panel": {},
    "./item-detail-store": {
      ItemDetailStore: class {
        peek() {
          return undefined;
        }
      },
      useItemDetail: (_store: unknown, selected: Item | undefined) => {
        state.requested = selected;
        return {};
      },
    },
    "./utils": { getItemIcon: () => "" },
  });
  const render = (items: Item[], suggestedItems: Item[] = []) =>
    harness.render(ItemList, { items, suggestedItems, isLoading: false, emptyView: {} });
  const select = (list: Element, id: string | null) =>
    (list.props.onSelectionChange as (id: string | null) => void)(id);
  return { render, select, state };
}

test("details follow the selection Raycast reports, which is only set when the list appears", () => {
  const { render, select, state } = loadItemList();
  const second = { ...item, itemId: "second" };
  const anotherVault = { ...item, shareId: "other", itemId: "third" };
  const initial = render([item, second], [item]);
  assert.equal(initial.props.selectedItemId, format.itemKey(item));
  // Once Raycast reports the suggestion it selected, the selection is left to Raycast, which would otherwise
  // recentre the list on every move.
  select(initial, format.itemKey(item));
  select(render([item, second], [item]), format.itemKey(second));
  assert.equal(render([item, second], [item]).props.selectedItemId, undefined);
  assert.equal(state.requested, second);
  const changedVault = render([anotherVault]);
  assert.equal(changedVault.props.selectedItemId, undefined);
  assert.equal(state.requested, anotherVault);
  select(changedVault, null);
  render([anotherVault]);
  assert.equal(state.requested, undefined);
});

test("a suggestion showing up after the list appeared doesn't move the cursor", () => {
  const { render } = loadItemList();
  const second = { ...item, itemId: "second" };
  assert.equal(render([], []).props.selectedItemId, undefined);
  assert.equal(render([item, second]).props.selectedItemId, undefined);
  assert.equal(render([item, second], [second]).props.selectedItemId, undefined);
});

test("a complete shared cache replaces legacy per-vault caches", async () => {
  const saved = new Map([["proton_pass_items_cache_vault", JSON.stringify({ data: [item], timestamp: 0 })]]);
  const cache = loadView("cache.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({}),
      LocalStorage: {
        getItem: async (key: string) => saved.get(key),
        setItem: async (key: string, value: string) => {
          saved.set(key, value);
        },
        allItems: async () => Object.fromEntries(saved),
        removeItem: async (key: string) => {
          saved.delete(key);
        },
      },
    },
  }) as unknown as { setCachedItems: (items: Item[], completeListing?: boolean) => Promise<void> };
  await cache.setCachedItems([]);
  assert.equal(saved.has("proton_pass_items_cache_vault"), true);
  await cache.setCachedItems([], true);
  assert.equal(saved.has("proton_pass_items_cache_vault"), false);
  assert.deepEqual(JSON.parse(saved.get("proton_pass_items_cache")!).data, []);
});

test("Get TOTP preserves failed-vault codes with Retry and retires legacy items only after a complete listing", async () => {
  const totpItem = { ...item, hasTotp: true };
  for (const { complete, previousItems, failedShareId = "vault" } of [
    { complete: true, previousItems: [] },
    { complete: false, previousItems: [totpItem] },
    { complete: false, previousItems: [] },
    { complete: false, previousItems: [item] },
    { complete: false, previousItems: [totpItem], failedShareId: "other" },
  ]) {
    const harness = hookHarness();
    let calls = 0;
    const toasts: { message: string; primaryAction: { onAction: () => Promise<void> } }[] = [];
    const saved = new Map([
      ["proton_pass_items_cache_vault", JSON.stringify({ data: [item], timestamp: 0 })],
      ["proton_pass_items_cache", JSON.stringify({ data: previousItems, timestamp: 0 })],
    ]);
    const api = {
      List: { Section: {}, EmptyView: {} },
      Action: {},
      ActionPanel: {},
      Icon: {},
      Color: { Green: "green" },
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      Toast: { Style: {} },
      showToast: async (toast: (typeof toasts)[number]) => {
        toasts.push(toast);
      },
      getPreferenceValues: () => ({}),
      LocalStorage: {
        getItem: async (key: string) => saved.get(key),
        setItem: async (key: string, value: string) => {
          saved.set(key, value);
        },
        allItems: async () => Object.fromEntries(saved),
        removeItem: async (key: string) => {
          saved.delete(key);
        },
      },
    };
    const cache = loadView("cache.ts", { "@raycast/api": api });
    const { default: Command } = loadView("../get-totp.tsx", {
      react: harness.react,
      "@raycast/api": api,
      "./lib/pass-cli": {
        getTotp: async () => "123456",
        listVaultsAndItems: async () => {
          calls++;
          return {
            items: [],
            failedVaults:
              complete || calls > 1
                ? []
                : [{ vault: { shareId: failedShareId, name: "Personal" }, message: "Offline" }],
          };
        },
      },
      "./lib/types": { PassCliError },
      "./lib/utils": {
        getTotpRemainingSeconds: () => 30,
        getItemIcon: () => "",
        formatTotpCode: (code: string) => code,
      },
      "./lib/cache": cache,
      "./lib/refresh": refresh,
      "./lib/error-views": {
        renderErrorView: (error: unknown, onRetry: unknown) => (error ? { props: { error, onRetry } } : null),
      },
    });
    harness.render(Command, {});
    harness.effects.forEach((effect) => effect());
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(saved.has("proton_pass_items_cache_vault"), !complete);
    assert.deepEqual(JSON.parse(saved.get("proton_pass_items_cache")!).data, previousItems);
    if (!complete) {
      const view = harness.render(Command, {});
      const hasSavedCodes = previousItems.some((item) => item.hasTotp && item.shareId === failedShareId);
      const retry = hasSavedCodes ? toasts[0]?.primaryAction.onAction : view.props.onRetry;
      if (hasSavedCodes) {
        const row = actions(view).find((entry) => entry.title === totpItem.title);
        assert.equal((row?.accessories as { tag: { value: string } }[] | undefined)?.[0]?.tag.value, "123456");
        assert.equal(toasts[0]?.message, "Offline");
      } else {
        assert.equal(view.props.error, "unknown");
        assert.equal(
          actions(view).some((entry) => entry.title === totpItem.title),
          false,
        );
      }
      assert.equal(typeof retry, "function");
      await (retry as () => Promise<void>)();
      assert.equal(calls, 2);
      assert.equal(saved.has("proton_pass_items_cache_vault"), false);
      assert.deepEqual(JSON.parse(saved.get("proton_pass_items_cache")!).data, []);
    }
  }
});

function totpCommandFixture(
  listVaultsAndItems: () => Promise<{
    items: Item[];
    failedVaults: { vault: { shareId: string; name: string }; message: string }[];
  }>,
  getTotp: (shareId: string, itemId: string) => Promise<string> = async () => "123456",
  writeCache: (items: Item[]) => Promise<void> = async () => undefined,
  globals: Record<string, unknown> = {},
) {
  const harness = hookHarness();
  const toasts: { primaryAction: { onAction: () => Promise<void> } }[] = [];
  const writes: Item[][] = [];
  const copied: string[] = [];
  let clears = 0;
  let savedItems: Item[] = [];
  const { default: Command } = loadView(
    "../get-totp.tsx",
    {
      react: harness.react,
      "@raycast/api": {
        List: { Section: {}, EmptyView: {} },
        Action: {},
        ActionPanel: {},
        Icon: {},
        Color: {},
        Keyboard: { Shortcut: { Common: { Refresh: {} } } },
        Toast: { Style: {} },
        getPreferenceValues: () => ({}),
        Clipboard: {
          copy: async (value: string) => {
            copied.push(value);
          },
        },
        showToast: async (toast: (typeof toasts)[number]) => {
          toasts.push(toast);
        },
      },
      "./lib/pass-cli": { listVaultsAndItems, getTotp },
      "./lib/types": { PassCliError },
      "./lib/utils": {
        getTotpRemainingSeconds: () => 30,
        getItemIcon: () => "",
        formatTotpCode: (code: string) => code,
      },
      "./lib/cache": {
        getCachedItems: async () => null,
        setCachedItems: async (items: Item[]) => {
          await writeCache(items);
          savedItems = items;
          writes.push(items);
        },
        clearCache: async () => {
          clears++;
          savedItems = [];
        },
      },
      "./lib/refresh": refresh,
      "./lib/error-views": {
        renderErrorView: (error: unknown, onRetry: unknown) => (error ? { props: { error, onRetry } } : null),
      },
    },
    {
      Date: class extends Date {
        static now() {
          return 0;
        }
      },
      ...globals,
    },
  );
  const render = () => harness.render(Command, {});
  render();
  harness.effects.forEach((effect) => effect());
  return {
    render,
    toasts,
    writes,
    copied,
    get clears() {
      return clears;
    },
    get savedItems() {
      return savedItems;
    },
  };
}

test("TOTP Retry keeps unsaved visible codes when their vault fails, then removes them after a successful deletion", async () => {
  let calls = 0;
  const fixture = totpCommandFixture(
    async () => {
      calls++;
      return {
        items: calls === 1 ? [{ ...item, hasTotp: true }] : [],
        failedVaults:
          calls < 3
            ? [{ vault: { shareId: calls === 1 ? "other" : "vault", name: "Offline vault" }, message: "Offline" }]
            : [],
      };
    },
    async () => {
      if (calls > 1) throw new Error("Offline");
      return "123456";
    },
  );
  await new Promise(setImmediate);
  await fixture.toasts[0].primaryAction.onAction();
  const row = actions(fixture.render()).find((entry) => entry.title === item.title);
  assert.equal((row?.accessories as { tag: { value: string } }[] | undefined)?.[0].tag.value, "123456");
  assert.equal(fixture.writes.length, 0);
  await fixture.toasts[1].primaryAction.onAction();
  assert.equal(
    actions(fixture.render()).some((entry) => entry.title === item.title),
    false,
  );
  assert.deepEqual(fixture.writes, [[]]);
});

test("only the latest TOTP load can replace codes, cache, loading state, or errors", async () => {
  for (const olderFails of [false, true]) {
    let calls = 0;
    let finishOlder!: () => void;
    const oldResult = new Promise<void>((resolve) => {
      finishOlder = resolve;
    });
    const newer = { ...item, itemId: "new", title: "New login", hasTotp: true };
    const fixture = totpCommandFixture(async () => {
      calls++;
      if (calls === 1)
        return {
          items: [{ ...item, hasTotp: true }],
          failedVaults: [{ vault: { shareId: "other", name: "Other" }, message: "Offline" }],
        };
      if (calls === 2) {
        await oldResult;
        if (olderFails) throw new Error("Old failure");
        return { items: [{ ...item, hasTotp: true }], failedVaults: [] };
      }
      return { items: [newer], failedVaults: [] };
    });
    await new Promise(setImmediate);
    const retry = fixture.toasts[0].primaryAction.onAction;
    const older = retry();
    await new Promise(setImmediate);
    await retry();
    finishOlder();
    await older;
    const view = fixture.render();
    assert.equal(
      actions(view).some((entry) => entry.title === item.title),
      false,
    );
    assert.equal(
      actions(view).some((entry) => entry.title === newer.title),
      true,
    );
    assert.deepEqual(fixture.writes, [[newer]]);
    assert.equal(fixture.toasts.length, 1);
    assert.equal(view.props.isLoading, false);
  }
});

test("TOTP loads discard late code results and order in-flight cache writes", async () => {
  for (const stalled of ["codes", "cache"]) {
    let calls = 0;
    let finishOlder!: () => void;
    const wait = new Promise<void>((resolve) => {
      finishOlder = resolve;
    });
    const olderItem = { ...item, itemId: "old", title: "Old login", hasTotp: true };
    const newerItem = { ...item, itemId: "new", title: "New login", hasTotp: true };
    const fixture = totpCommandFixture(
      async () => {
        calls++;
        return {
          items: [calls === 2 ? olderItem : newerItem],
          failedVaults: calls === 1 ? [{ vault: { shareId: "other", name: "Other" }, message: "Offline" }] : [],
        };
      },
      async (_shareId, itemId) => {
        if (stalled === "codes" && itemId === "old") await wait;
        return "123456";
      },
      async (items) => {
        if (stalled === "cache" && items[0].itemId === "old") await wait;
      },
    );
    await new Promise(setImmediate);
    const retry = fixture.toasts[0].primaryAction.onAction;
    const older = retry();
    await new Promise(setImmediate);
    const newer = retry();
    await new Promise(setImmediate);
    if (stalled === "codes") await newer;
    else assert.equal(fixture.render().props.isLoading, true);
    finishOlder();
    await Promise.all([older, newer]);
    assert.equal(
      actions(fixture.render()).some((entry) => entry.title === olderItem.title),
      false,
    );
    assert.equal(
      actions(fixture.render()).some((entry) => entry.title === newerItem.title),
      true,
    );
    assert.deepEqual(fixture.writes.at(-1), [newerItem]);
    assert.equal(fixture.writes.length, stalled === "codes" ? 1 : 2);
    assert.equal(fixture.render().props.isLoading, false);
  }
});

test("expired TOTP codes are hidden and cannot be copied after a failed Retry", async () => {
  let now = 0;
  let calls = 0;
  const fixture = totpCommandFixture(
    async () => ({
      items: calls === 0 ? [{ ...item, hasTotp: true }] : [],
      failedVaults: [{ vault: { shareId: calls === 0 ? "other" : "vault", name: "Offline" }, message: "Offline" }],
    }),
    async () => {
      if (++calls > 1) throw new Error("Offline");
      return "123456";
    },
    undefined,
    {
      Date: class extends Date {
        static now() {
          return now;
        }
      },
    },
  );
  await new Promise(setImmediate);
  const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  const oldCopy = actions(row.actions).find((entry) => entry.title === "Copy TOTP Code")!
    .onAction as () => Promise<void>;
  now = 30_000;
  await fixture.toasts[0].primaryAction.onAction();
  const expiredRow = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  assert.equal((expiredRow.accessories as { tag: { value: string } }[])[0].tag.value, "---");
  assert.equal(
    actions(expiredRow.actions).some((entry) => entry.title === "Copy TOTP Code"),
    false,
  );
  await oldCopy();
  assert.deepEqual(fixture.copied, []);
  await new Promise(setImmediate);
});

test("a boundary refresh fetches current codes for a list that replaced its snapshot", async () => {
  let now = 0;
  let tick!: () => void;
  let listings = 0;
  let codes = 0;
  let finishListingCode!: (code: string) => void;
  let finishRefreshCode!: (code: string) => void;
  const listingCode = new Promise<string>((resolve) => {
    finishListingCode = resolve;
  });
  const refreshCode = new Promise<string>((resolve) => {
    finishRefreshCode = resolve;
  });
  const replacement = { ...item, itemId: "replacement", title: "Replacement", hasTotp: true };
  const fixture = totpCommandFixture(
    async () => {
      listings++;
      return {
        items: [listings === 1 ? { ...item, hasTotp: true } : replacement],
        failedVaults: [{ vault: { shareId: "other", name: "Other" }, message: "Offline" }],
      };
    },
    async () => {
      codes++;
      if (codes === 2) return listingCode;
      if (codes === 3) return refreshCode;
      return codes === 1 ? "123456" : "654321";
    },
    undefined,
    {
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setInterval: (callback: () => void) => {
        tick = callback;
        return 0;
      },
    },
  );
  await new Promise(setImmediate);
  now = 29_999;
  const retry = fixture.toasts[0].primaryAction.onAction();
  await new Promise(setImmediate);
  now = 30_000;
  tick();
  finishListingCode("111111");
  await retry;
  finishRefreshCode("222222");
  await new Promise(setImmediate);
  const row = actions(fixture.render()).find((entry) => entry.title === replacement.title)!;
  assert.equal((row.accessories as { tag: { value: string } }[])[0].tag.value, "654321");
  assert.equal(codes, 4);
});

test("a slow code refresh retries in the new time step instead of waiting for another boundary", async () => {
  let now = 0;
  let tick!: () => void;
  let codes = 0;
  let finishOldCode!: (code: string) => void;
  const oldCode = new Promise<string>((resolve) => {
    finishOldCode = resolve;
  });
  const fixture = totpCommandFixture(
    async () => ({ items: [{ ...item, hasTotp: true }], failedVaults: [] }),
    async () => {
      codes++;
      if (codes === 2) return oldCode;
      return codes === 1 ? "123456" : "654321";
    },
    undefined,
    {
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setInterval: (callback: () => void) => {
        tick = callback;
        return 0;
      },
    },
  );
  await new Promise(setImmediate);
  now = 29_999;
  const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  const refresh = actions(row.actions).find((entry) => entry.title === "Refresh Codes")!
    .onAction as () => Promise<void>;
  const pending = refresh();
  now = 30_000;
  tick();
  finishOldCode("111111");
  await pending;
  const updated = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  assert.equal((updated.accessories as { tag: { value: string } }[])[0].tag.value, "654321");
  assert.equal(codes, 3);
  assert.equal(fixture.render().props.isLoading, false);
});

test("repeated slow TOTP responses stop with Retry instead of keeping refresh running", async () => {
  let now = 0;
  let codes = 0;
  const fixture = totpCommandFixture(
    async () => ({ items: [{ ...item, hasTotp: true }], failedVaults: [] }),
    async () => {
      codes++;
      if (codes === 2 || codes === 3) now += 31_000;
      return "123456";
    },
    undefined,
    {
      Date: class extends Date {
        static now() {
          return now;
        }
      },
    },
  );
  await new Promise(setImmediate);
  const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  await (actions(row.actions).find((entry) => entry.title === "Refresh Codes")!.onAction as () => Promise<void>)();
  assert.equal(codes, 3);
  assert.equal(fixture.render().props.isLoading, false);
  const updated = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  assert.equal((updated.accessories as { tag: { value: string } }[])[0].tag.value, "---");
  const retry = fixture.toasts.at(-1)?.primaryAction;
  assert.equal(typeof retry?.onAction, "function");
  await retry!.onAction();
  assert.equal(codes, 4);
});

test("TOTP session expiry clears rows and cache and prevents old copy callbacks or partial retries restoring them", async () => {
  for (const source of ["listing", "code", "refresh"]) {
    let listings = 0;
    let codes = 0;
    const fixture = totpCommandFixture(
      async () => {
        listings++;
        if (source === "listing" && listings === 2) throw new PassCliError("Session ended", "not_authenticated");
        return {
          items: listings < 3 ? [{ ...item, hasTotp: true }] : [],
          failedVaults: [{ vault: { shareId: listings < 3 ? "other" : "vault", name: "Offline" }, message: "Offline" }],
        };
      },
      async () => {
        if (++codes === 2 && source !== "listing") throw new PassCliError("Session ended", "not_authenticated");
        return "123456";
      },
    );
    await new Promise(setImmediate);
    const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
    const oldCopy = actions(row.actions).find((entry) => entry.title === "Copy TOTP Code")!
      .onAction as () => Promise<void>;
    if (source === "refresh") {
      await (actions(row.actions).find((entry) => entry.title === "Refresh Codes")!.onAction as () => Promise<void>)();
      listings++;
    } else await fixture.toasts[0].primaryAction.onAction();
    const errorView = fixture.render();
    assert.equal(errorView.props.error, "not_authenticated");
    assert.equal(fixture.clears, 1);
    assert.deepEqual(fixture.savedItems, []);
    await oldCopy();
    await new Promise(setImmediate);
    assert.deepEqual(fixture.copied, []);
    await (errorView.props.onRetry as () => Promise<void>)();
    assert.equal(fixture.render().props.error, "unknown");
    assert.equal(
      actions(fixture.render()).some((entry) => entry.title === item.title),
      false,
    );
  }
});

test("TOTP session reset clears an in-flight cache write and prevents that load restoring rows", async () => {
  let listings = 0;
  let rejectCodes = false;
  let finishWrite!: () => void;
  const write = new Promise<void>((resolve) => {
    finishWrite = resolve;
  });
  const fresh = { ...item, itemId: "new", title: "New login", hasTotp: true };
  const fixture = totpCommandFixture(
    async () => {
      listings++;
      return {
        items: [listings === 1 ? { ...item, hasTotp: true } : fresh],
        failedVaults: listings === 1 ? [{ vault: { shareId: "other", name: "Other" }, message: "Offline" }] : [],
      };
    },
    async () => {
      if (rejectCodes) throw new PassCliError("Session ended", "not_authenticated");
      return "123456";
    },
    async () => write,
  );
  await new Promise(setImmediate);
  const loading = fixture.toasts[0].primaryAction.onAction();
  await new Promise(setImmediate);
  rejectCodes = true;
  const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  const refreshing = (
    actions(row.actions).find((entry) => entry.title === "Refresh Codes")!.onAction as () => Promise<void>
  )();
  await new Promise(setImmediate);
  finishWrite();
  await Promise.all([loading, refreshing]);
  assert.equal(fixture.render().props.error, "not_authenticated");
  assert.deepEqual(fixture.savedItems, []);
  assert.equal(fixture.clears, 1);
});

test("an empty failed selected vault offers lasting Retry while other vaults load", async () => {
  const harness = hookHarness();
  const vault = { shareId: "vault", name: "Personal" };
  let calls = 0;
  let writes = 0;
  const { SearchItemsView } = loadView("search-items-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Dropdown: { Section: {}, Item: {} } },
      Icon: {},
      getPreferenceValues: () => ({}),
      Toast: { Style: {} },
      showToast: async () => undefined,
    },
    "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
    "./pass-cli": {
      listItems: async () => [],
      listVaultsAndItems: async () => {
        calls++;
        if (calls === 2) throw new PassCliError("Offline retry", "network_error");
        return {
          vaults: [vault, { shareId: "other", name: "Other" }],
          items: [{ ...item, shareId: "other" }],
          failedVaults: [{ vault, message: "Offline" }],
        };
      },
    },
    "./types": { PassCliError },
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      setCachedItems: async () => {
        writes++;
      },
      setCachedVaults: async () => {
        writes++;
      },
    },
    "./error-views": { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) },
    "./login-view": {},
    "./format": {},
    "./item-list": {},
    "./refresh": refresh,
    "./item-counts": itemCounts,
    "./vault-sharing": vaultSharing,
  });
  const render = () => harness.render(SearchItemsView, { initialVault: vault });
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal((render().props.items as Item[]).length, 0);
  const empty = render().props.emptyView as { title: string; description: string; onRetry: () => Promise<void> };
  assert.equal(empty.title, "Couldn't Load Items");
  assert.equal(empty.description, "Offline");
  await empty.onRetry();
  assert.equal(calls, 2);
  assert.equal(writes, 0);
  const retriedEmpty = render().props.emptyView as typeof empty;
  assert.equal(retriedEmpty.description, "Offline retry");
  assert.equal(typeof retriedEmpty.onRetry, "function");
});

function searchItemsFixture(services: { "./pass-cli": unknown; "./cache": unknown }) {
  const harness = hookHarness();
  const { SearchItemsView } = loadView("search-items-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Dropdown: { Section: {}, Item: {} } },
      Icon: {},
      getPreferenceValues: () => ({}),
      Toast: { Style: {} },
      showToast: async () => undefined,
    },
    "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
    "./types": { PassCliError },
    "./error-views": { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) },
    "./login-view": {},
    "./format": {},
    "./item-list": {},
    "./refresh": refresh,
    "./item-counts": itemCounts,
    "./vault-sharing": vaultSharing,
    ...services,
  });
  return { harness, SearchItemsView };
}

test("List Vaults saves vaults and items together, from complete listings only", async () => {
  const personal = { shareId: "vault", name: "Personal" };
  const added = { shareId: "added", name: "Added" };
  const saved: string[] = [];
  let failing = true;
  const harness = hookHarness();
  const { default: Command } = loadView("../list-vaults.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
    },
    "./lib/pass-cli": {
      listVaultSharing: async () => new Map(),
      listVaultsAndItems: async () => ({
        vaults: [personal, added],
        items: [item],
        failedVaults: failing ? [{ vault: added, message: "Offline" }] : [],
      }),
    },
    "./lib/types": { PassCliError },
    "./lib/search-items-view": {},
    "./lib/login-view": {},
    "./lib/cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      setCachedItems: async () => {
        saved.push("items");
      },
      setCachedVaults: async () => {
        saved.push("vaults");
      },
    },
    "./lib/item-counts": itemCounts,
    "./lib/refresh": refresh,
    "./lib/shortcuts": shortcuts,
    "./lib/vault-sharing": vaultSharing,
  });
  harness.render(Command, {});
  const [load] = harness.effects;
  load();
  await new Promise(setImmediate);
  // Saved without its items, the vault that failed would count 0 items on the next open.
  assert.deepEqual(saved, []);

  failing = false;
  load();
  await new Promise(setImmediate);
  assert.deepEqual(saved.sort(), ["items", "vaults"]);
});

test("Search Items keeps the vaults' sharing when it saves pass-cli's vault list", async () => {
  let savedVaults: unknown;
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      listVaultsAndItems: async () => ({
        vaults: [{ shareId: "vault", name: "Personal" }],
        items: [item],
        failedVaults: [],
      }),
    },
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => ({
        data: [{ shareId: "vault", name: "Personal", role: "owner", isShared: true }],
        timestamp: 0,
        isStale: true,
      }),
      setCachedItems: async () => undefined,
      setCachedVaults: async (vaults: unknown) => {
        savedVaults = vaults;
      },
    },
  });
  harness.render(SearchItemsView, {});
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(JSON.stringify(savedVaults)), [
    { shareId: "vault", name: "Personal", role: "owner", isShared: true },
  ]);
});

test("a vault opened from List Vaults keeps its count when its items can't be listed", async () => {
  const failed = { shareId: "vault", name: "Personal" };
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      listItems: async () => {
        throw new PassCliError("Offline", "network_error");
      },
      listVaultsAndItems: async () => ({
        vaults: [failed, { shareId: "other", name: "Work" }],
        items: [{ ...item, shareId: "other" }],
        failedVaults: [{ vault: failed, message: "Offline" }],
      }),
    },
    "./cache": { getCachedItems: async () => null, getCachedVaults: async () => null },
  });
  const render = () => harness.render(SearchItemsView, { initialVault: { ...failed, itemCount: 7 } });
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  const dropdown = render().props.searchBarAccessory as Element;
  assert.deepEqual(Object.fromEntries(dropdown.props.itemCounts as Map<string, number>), { vault: 7, other: 1 });
});
