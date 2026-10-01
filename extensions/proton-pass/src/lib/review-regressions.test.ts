import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as refresh from "./refresh";
import * as format from "./format";
import * as shortcuts from "./shortcuts";
import { Item, ItemDetail, PassCliError } from "./types";

type Element = { props: Record<string, unknown> };
type Component = (props: Record<string, unknown>) => Element;

// Run the real UI callbacks with Raycast services replaced; no account or clipboard access.
function loadView(file: string, services: Record<string, unknown>): Record<string, Component> {
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
    process: { platform: "darwin", env: { PATH: "" } },
    console: { error: () => undefined },
  });
  return module.exports;
}

function actions(element: unknown): Element["props"][] {
  if (!element || typeof element !== "object" || !("props" in element)) return [];
  const props = (element as Element).props;
  return [props, ...[props.children].flat().flatMap(actions)];
}

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
  const fills: { values: string[] }[] = [];
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
        copy: async () => {
          events.push("copy");
        },
      },
      showToast: async () => undefined,
    },
    "./autofill": {
      canFillFrontmostApp: true,
      fillFrontmostApp: async (request: { values: string[] }) => fills.push(request),
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
    store: { peek: () => ({ ...selectedItem, password: "fake-secret" }) },
    isShowingDetail: true,
    onToggleDetail: () => undefined,
    onUse: () => events.push("use"),
  });
  return { entries: actions(panel), events, fills };
}

test("Enter views details by default and copies or fills only when selected in preferences", async () => {
  const titles = (entries: Element["props"][]) => entries.filter((entry) => entry.title).map((entry) => entry.title);
  assert.equal(titles(itemActions().entries)[0], "View Details");
  const { entries, events } = itemActions("copy");
  assert.equal(titles(entries)[0], "Copy Password");
  await (entries.find((entry) => entry.title === "Copy Password")?.onAction as () => Promise<void>)();
  assert.deepEqual(events, ["copy", "use"]);
  assert.equal(titles(itemActions("copy", { ...item, hasPassword: false }).entries)[0], "View Details");
  assert.equal(titles(itemActions("copy", { ...item, type: "credit_card" }).entries)[0], "View Details");
  assert.equal(titles(itemActions("copy", { ...item, type: "note" }).entries)[0], "Show Note");
  const addedPassword = { ...item, password: "fake-secret" };
  assert.equal(titles(itemActions("copy", { ...item, hasPassword: false }, addedPassword).entries)[0], "Copy Password");
  assert.equal(titles(itemActions("copy", item, { ...item, password: undefined }).entries)[0], "View Details");

  const filling = itemActions("fill");
  assert.equal(titles(filling.entries)[0], "Fill Login");
  await (filling.entries.find((entry) => entry.title === "Fill Login")?.onAction as () => Promise<void>)();
  assert.deepEqual(Array.from(filling.fills[0].values), [item.email, "fake-secret"]);
  assert.equal(titles(itemActions("fill", { ...item, hasPassword: false }).entries)[0], "View Details");
  assert.ok(titles(itemActions("fill", { ...item, hasPassword: false }).entries).includes("Paste Email"));
});

test("Copy Email and Copy Title have distinct Windows shortcuts", () => {
  const { entries } = itemActions();
  const shortcut = (title: string) =>
    (entries.find((entry) => entry.title === title)?.shortcut as { Windows: unknown }).Windows;
  assert.notEqual(JSON.stringify(shortcut("Copy Email")), JSON.stringify(shortcut("Copy Title")));
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
          (value: unknown) => {
            slots[index] = value;
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

test("opening a vault offline preserves its earlier per-vault item cache", async () => {
  const vault = { shareId: "vault", name: "Personal" };
  const saved = new Map([["proton_pass_items_cache_vault", JSON.stringify({ data: [item], timestamp: Date.now() })]]);
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
  });
  const render = () => harness.render(SearchItemsView, { initialVault: vault });
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal((render().props.items as Item[] | undefined)?.[0]?.title, item.title);
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
