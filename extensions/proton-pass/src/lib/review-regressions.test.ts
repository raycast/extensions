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
import * as sharedItems from "./shared-items";
import * as totp from "./totp";
import { Item, ItemDetail, PassCliError, Vault } from "./types";

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
      if (name === "./shared-items") return sharedItems;
      if (name === "./format") return format;
      if (name === "./totp") return totp;
      if (name === "./sort" || name === "./lib/sort") return sort;
      if (name === "./vault-dropdown" || name === "./lib/vault-dropdown") return vaultDropdown;
      if (name === "./lib/item-counts") return itemCounts;
      if (name === "./lib/shared-items") return sharedItems;
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

// The real sorting, with the Sort By preference at its default.
const sort = loadView("sort.tsx", {
  "@raycast/api": { Icon: {}, getPreferenceValues: () => ({}) },
  "@raycast/utils": { useFrecencySorting: (data: unknown[]) => ({ data, visitItem: () => undefined }) },
  "./shortcuts": shortcuts,
});

// The vault menu's element isn't rendered here: only its constant and props matter.
const vaultDropdown = loadView("vault-dropdown.tsx", {
  react: { useRef: (current: unknown) => ({ current }) },
  "@raycast/api": { List: {}, Icon: {} },
  "./item-counts": itemCounts,
});

function actions(element: unknown): Element["props"][] {
  if (!element || typeof element !== "object" || !("props" in element)) return [];
  const props = (element as Element).props;
  return [props, ...[props.children].flat(Infinity).flatMap(actions)];
}

test("autofill targets the app Raycast was opened from, rejects Raycast, and keeps Raycast open meanwhile", async () => {
  const externalApp = { name: "Example", bundleId: "com.example.app" };
  const raycast = { name: "Raycast", bundleId: "com.raycast.macos" };
  for (const initialApp of [externalApp, raycast, undefined]) {
    let closed = false;
    const { getTargetApp } = loadView("autofill.ts", {
      "@raycast/api": {
        PopToRootType: { Suspended: "suspended" },
        // Raycast closes only to fill, once the item is loaded: its toast shows the loading meanwhile.
        closeMainWindow: async () => {
          closed = true;
        },
        getFrontmostApplication: async () => initialApp,
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
    assert.equal(closed, false);
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
    "./utils": { TOTP_ICON: "totp" },
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
        // Like React, a function is called once for the initial value.
        const index = cursor in slots ? cell(undefined) : cell(typeof initial === "function" ? initial() : initial);
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
      endedSessionError: async () => undefined,
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

test("the pass-cli not found screen opens the extension preferences first", async () => {
  let opened = 0;
  const { CliNotFoundView } = loadView("error-views.tsx", {
    react: {},
    "@raycast/api": {
      List: { EmptyView: {} },
      ActionPanel: {},
      Action: { OpenInBrowser: {} },
      Icon: {},
      Toast: { Style: {} },
      showToast: async () => undefined,
      openExtensionPreferences: async () => {
        opened++;
      },
    },
    "./types": { PROTON_PASS_CLI_DOCS: "https://example.com/docs" },
    "./cli": { clearCliCache: async () => undefined },
    "./login-view": {},
  });

  // The empty view holds its actions in a prop rather than in its children.
  const emptyView = actions(CliNotFoundView({})).find((props) => "description" in props);
  assert.equal(emptyView?.title, "Proton Pass CLI Not Found");
  const [fix, guide] = actions(emptyView?.actions).filter((props) => "title" in props);
  // The CLI Path preference is the fix, so its action is the one Enter runs.
  assert.equal(fix.title, "Open Extension Preferences");
  await (fix.onAction as () => Promise<void>)();
  assert.equal(opened, 1);
  assert.equal(guide.title, "Open Installation Guide");
  assert.equal(guide.url, "https://example.com/docs");
});

test("pass-cli not found shows its screen instead of the cached items, which can't load passwords or codes", async () => {
  const notFound = async (): Promise<never> => {
    throw new PassCliError("pass-cli not found at '/example/pass-cli'.", "not_installed");
  };
  const errorViews = { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) };

  const search = hookHarness();
  const { SearchItemsView } = loadView("search-items-view.tsx", {
    react: search.react,
    "@raycast/api": {
      List: { Dropdown: { Section: {}, Item: {} } },
      Icon: {},
      getPreferenceValues: () => ({}),
      Toast: { Style: { Failure: "failure" } },
      showToast: async () => undefined,
    },
    "@raycast/utils": { usePromise: () => ({ isLoading: false }) },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listItems: notFound,
      listVaultsAndItems: notFound,
    },
    "./types": { PassCliError },
    "./cache": {
      getCachedItems: async () => ({ data: [item], isStale: true }),
      getCachedVaults: async () => ({ data: [{ shareId: "vault", name: "Personal" }], isStale: true }),
    },
    "./error-views": errorViews,
    "./login-view": {},
    "./format": {},
    "./item-counts": itemCounts,
    "./item-list": {},
    "./refresh": refresh,
  });
  search.render(SearchItemsView, {});
  search.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(search.render(SearchItemsView, {}).props.error, "not_installed");

  const totp = hookHarness();
  const { default: Command } = loadView("../get-totp.tsx", {
    react: totp.react,
    "@raycast/api": {
      List: { Section: {}, EmptyView: {} },
      Action: {},
      ActionPanel: {},
      Icon: {},
      Color: { Green: "green" },
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      Toast: { Style: {} },
      showToast: async () => undefined,
      getPreferenceValues: () => ({}),
    },
    "./lib/pass-cli": { getTotp: notFound, listVaultsAndItems: notFound, localTotpCode: () => undefined },
    "./lib/types": { PassCliError },
    // Fixed-width digits are checked in format.test.ts; plain ones keep these assertions readable.
    "./lib/format": { itemKey: format.itemKey, monospace: (text: string) => text },
    "./lib/item-icon": { getListIcon: () => "" },
    "./lib/shortcuts": shortcuts,
    "@raycast/utils": { useFrecencySorting: (items: Item[]) => ({ data: items, visitItem: () => undefined }) },
    "./lib/utils": {
      getTotpRemainingSeconds: () => 30,
      totpProgressIcon: () => "",
      totpTimerColor: () => "",
      getItemIcon: () => "",
      formatTotpCode: (code: string) => code,
    },
    "./lib/cache": {
      getCachedItems: async () => ({ data: [{ ...item, hasTotp: true }] }),
      setCachedItems: async () => undefined,
      clearCache: async () => undefined,
    },
    "./lib/refresh": refresh,
    "./lib/error-views": errorViews,
  });
  totp.render(Command, {});
  totp.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(totp.render(Command, {}).props.error, "not_installed");
});

test("item-list authentication failures clear saved session metadata on both listing paths", async () => {
  let clears = 0;
  const vault = { shareId: "vault", name: "Personal" };
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false, supportPath: "/fixture" }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": {
      clearCache: async () => {
        clears++;
      },
    },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => ({
        listVaults: async () => [vault],
        listItemShares: async () => [],
        listItems: async () => {
          throw new PassCliError("Session ended", "not_authenticated");
        },
      }),
    },
    "./core/login": { isDetachedLoginRunning: async () => false },
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

function passCliWithAdapter(adapter: Record<string, unknown>) {
  return loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false, supportPath: "/fixture" }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": { clearCache: async () => undefined },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": { createPassCliAdapter: () => adapter },
    "./core/login": { isDetachedLoginRunning: async () => false },
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as {
    listVaultsAndItems: () => Promise<{
      vaults: Vault[];
      items: Item[];
      failedVaults: { vault: Vault; message: string; shareIds?: string[] }[];
    }>;
  };
}

test("items shared one by one are listed under Shared with Me, through their own share", async () => {
  const listed: string[] = [];
  const api = passCliWithAdapter({
    listVaults: async () => [{ shareId: "vault", name: "Personal" }],
    listItemShares: async () => ["item-share", "also-in-vault"],
    listItems: async (shareId: string, vaultName: string) => {
      listed.push(shareId);
      if (shareId === "vault") return [{ ...item, shareId, itemId: "in-vault", vaultName }];
      // The share printed can be the one of the vault the item comes from, which the user can't open.
      return [{ ...item, shareId: "owner-vault", itemId: shareId === "item-share" ? "shared" : "in-vault", vaultName }];
    },
  });
  const { vaults, items, failedVaults } = await api.listVaultsAndItems();
  assert.equal(listed.sort().join(), "also-in-vault,item-share,vault");
  assert.equal(vaults.map((vault) => vault.name).join(), "Personal,Shared with Me");
  assert.equal(
    items.map((entry) => `${entry.itemId} ${entry.shareId} ${entry.vaultName} ${entry.sharedWithMe === true}`).join(),
    "in-vault vault Personal false,shared item-share Shared with Me true",
  );
  assert.equal(failedVaults.length, 0);
});

test("the vaults' items don't wait for the shares of the items shared with the user, which can take seconds", async () => {
  let releaseShares: (shareIds: string[]) => void = () => undefined;
  const listed: string[] = [];
  const api = passCliWithAdapter({
    listVaults: async () => [{ shareId: "vault", name: "Personal" }],
    listItemShares: () =>
      new Promise((resolve) => {
        releaseShares = resolve;
      }),
    listItems: async (shareId: string, vaultName: string) => {
      listed.push(shareId);
      return [{ ...item, shareId, itemId: shareId, vaultName }];
    },
  });
  const listing = api.listVaultsAndItems();
  await new Promise(setImmediate);
  assert.equal(listed.join(), "vault");

  releaseShares(["item-share"]);
  const { items } = await listing;
  assert.equal(listed.join(), "vault,item-share");
  assert.equal(items.length, 2);
});

test("vault and shared item listings run at most 8 pass-cli commands at once, together", async () => {
  let running = 0;
  let most = 0;
  const api = passCliWithAdapter({
    listVaults: async () => Array.from({ length: 12 }, (_, index) => ({ shareId: `vault-${index}`, name: "Vault" })),
    listItemShares: async () => Array.from({ length: 6 }, (_, index) => `item-share-${index}`),
    listItems: async (shareId: string, vaultName: string) => {
      running++;
      most = Math.max(most, running);
      await new Promise(setImmediate);
      running--;
      return [{ ...item, shareId, itemId: shareId, vaultName }];
    },
  });
  const { items } = await api.listVaultsAndItems();
  assert.equal(items.length, 18);
  assert.equal(most, 8);
});

test("overlapping listings, e.g. the vault list and the item list it opens, still run at most 8 commands at once", async () => {
  let running = 0;
  let most = 0;
  const api = passCliWithAdapter({
    listVaults: async () => Array.from({ length: 12 }, (_, index) => ({ shareId: `vault-${index}`, name: "Vault" })),
    listItemShares: async () => [],
    listItems: async (shareId: string, vaultName: string) => {
      running++;
      most = Math.max(most, running);
      await new Promise(setImmediate);
      running--;
      return [{ ...item, shareId, itemId: shareId, vaultName }];
    },
  });
  const [first, second] = await Promise.all([api.listVaultsAndItems(), api.listVaultsAndItems()]);
  assert.equal(first.items.length + second.items.length, 24);
  assert.equal(most, 8);
});

test("every listing command counts toward the 8 at once: vaults, shares, items of one vault and members", async () => {
  let running = 0;
  let most = 0;
  const command =
    <T>(result: T, ticks = 1) =>
    async () => {
      running++;
      most = Math.max(most, running);
      for (let tick = 0; tick < ticks; tick++) await new Promise(setImmediate);
      running--;
      return result;
    };
  const vaults = Array.from({ length: 12 }, (_, index) => ({ shareId: `vault-${index}`, name: "Vault" }));
  const api = passCliWithAdapter({
    listVaults: command(vaults),
    // Slow, as it can be: it used to run beside 8 item listings.
    listItemShares: command([], 5),
    listItems: (shareId: string, vaultName: string) => command([{ ...item, shareId, itemId: shareId, vaultName }])(),
    listVaultRoles: command(new Map(vaults.map(({ shareId }) => [shareId, "owner"]))),
    countVaultMembers: command(1),
  }) as unknown as {
    listVaultsAndItems: () => Promise<{ items: Item[] }>;
    listItems: (shareId: string, vaults: Vault[]) => Promise<Item[]>;
    listVaultSharing: () => Promise<Map<string, unknown>>;
  };
  const [first, second, oneVault, sharing] = await Promise.all([
    api.listVaultsAndItems(),
    api.listVaultsAndItems(),
    api.listItems("vault-0", [vaults[0]]),
    api.listVaultSharing(),
  ]);
  assert.equal(first.items.length + second.items.length + oneVault.length, 25);
  assert.equal(sharing.size, 12);
  assert.equal(most, 8);
});

test("a shared item failing to load is named, so that the shared items that loaded aren't kept twice", async () => {
  const api = passCliWithAdapter({
    listVaults: async () => [{ shareId: "vault", name: "Personal" }],
    listItemShares: async () => ["loaded-share", "failed-share"],
    listItems: async (shareId: string, vaultName: string) => {
      if (shareId === "failed-share") throw new PassCliError("Network unavailable", "network_error");
      return [{ ...item, shareId, itemId: shareId, vaultName }];
    },
  });
  const { items, failedVaults } = await api.listVaultsAndItems();
  assert.equal(items.map(({ shareId }) => shareId).join(), "vault,loaded-share");
  assert.equal(
    JSON.stringify(failedVaults.map(({ vault, shareIds }) => ({ name: vault.name, shareIds }))),
    JSON.stringify([{ name: "Shared with Me", shareIds: ["failed-share"] }]),
  );
});

test("listed TOTP secrets stay in memory to generate codes, and are forgotten once the session ends", async () => {
  const uri = "otpauth://totp/Example?secret=JBSWY3DPEHPK3PXP";
  let ended = false;
  const api = passCliWithAdapter({
    listVaults: async () => [{ shareId: "vault", name: "Personal" }],
    listItemShares: async () => [],
    listItems: async (shareId: string, vaultName: string, onTotpUri: (itemId: string, uri: string) => void) => {
      if (ended) throw new PassCliError("Session ended", "not_authenticated");
      onTotpUri("login", uri);
      return [{ ...item, shareId, vaultName, hasTotp: true }];
    },
  }) as unknown as {
    listVaultsAndItems: () => Promise<{ items: Item[] }>;
    localTotpCode: (shareId: string, itemId: string) => string | undefined;
  };
  assert.equal(api.localTotpCode("vault", "login"), undefined);
  const { items } = await api.listVaultsAndItems();
  assert.equal(JSON.stringify(items).includes("otpauth"), false);
  assert.equal(api.localTotpCode("vault", "login"), totp.generateTotp(totp.parseOtpauthUri(uri)!).code);

  ended = true;
  await assert.rejects(api.listVaultsAndItems(), /Session ended/);
  assert.equal(api.localTotpCode("vault", "login"), undefined);
});

test("Shared with Me failing to load doesn't hold the vaults back, unlike an ended session", async () => {
  let shareError = new PassCliError("Network unavailable", "network_error");
  const api = passCliWithAdapter({
    listVaults: async () => [{ shareId: "vault", name: "Personal" }],
    listItemShares: async () => {
      throw shareError;
    },
    listItems: async (shareId: string, vaultName: string) => [{ ...item, shareId, vaultName }],
  });
  const { vaults, items, failedVaults } = await api.listVaultsAndItems();
  // Shared with Me stays listed, so that the shared items known already keep showing.
  assert.equal(vaults.map((vault) => vault.name).join(), "Personal,Shared with Me");
  assert.equal(items.length, 1);
  assert.equal(
    failedVaults.map(({ vault, message }) => `${vault.name}: ${message}`).join(),
    "Shared with Me: Network unavailable",
  );

  shareError = new PassCliError("Session ended", "not_authenticated");
  await assert.rejects(api.listVaultsAndItems(), /Session ended/);
});

test("pass-cli commands wait for the session check, during which pass-cli can catch up with the account", async () => {
  const started: string[] = [];
  let finishCheck: () => void = () => undefined;
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false, supportPath: "/fixture" }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": {},
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => ({
        checkAuth: () => {
          started.push("info");
          return new Promise((resolve) => {
            finishCheck = () => resolve(true);
          });
        },
        getItem: async () => {
          started.push("item view");
          return item;
        },
      }),
    },
    "./core/login": { isDetachedLoginRunning: async () => false },
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as {
    endedSessionError: () => Promise<PassCliError | undefined>;
    getItem: (shareId: string, itemId: string) => Promise<unknown>;
  };
  const check = api.endedSessionError();
  // Started meanwhile, it would catch up with the account again, as long as the check.
  const detail = api.getItem("vault", "login");
  await new Promise(setImmediate);
  assert.equal(started.join(), "info");

  finishCheck();
  assert.equal(await check, undefined);
  await detail;
  assert.equal(started.join(), "info,item view");
});

test("only the user's own vaults have their members counted, to know whether they're shared", async () => {
  const counted: string[] = [];
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false, supportPath: "/fixture" }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
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
    "./core/login": { isDetachedLoginRunning: async () => false },
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

for (const stalled of ["roles", "members"]) {
  test(`sharing refresh starts no member commands after login begins during ${stalled}`, async () => {
    let release!: () => void;
    const pause = new Promise<void>((resolve) => {
      release = resolve;
    });
    let loginRunning = false;
    const counted: boolean[] = [];
    const api = loadView("pass-cli.ts", {
      "@raycast/api": {
        environment: { isDevelopment: false, supportPath: "/fixture" },
        getPreferenceValues: () => ({}),
      },
      "node:os": { homedir: () => "/fixture" },
      "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
      "./cache": {},
      "./cli": { ensureCli: async () => "/fixture-cli" },
      "./core/adapter": {
        createPassCliAdapter: () => ({
          listVaultRoles: async () => {
            if (stalled === "roles") await pause;
            return new Map(Array.from({ length: 9 }, (_, i) => [`vault-${i}`, "owner"]));
          },
          countVaultMembers: async () => {
            counted.push(loginRunning);
            if (stalled === "members") await pause;
            return 2;
          },
        }),
      },
      "./core/login": { isDetachedLoginRunning: async () => loginRunning },
      "./mock-data": {},
      "./types": { PassCliError },
    }) as unknown as { listVaultSharing: () => Promise<Map<string, unknown>> };

    const result = api.listVaultSharing().then(
      () => undefined,
      (error: unknown) => error,
    );
    await new Promise(setImmediate);
    assert.equal(counted.length, stalled === "roles" ? 0 : 8);
    loginRunning = true;
    release();
    const error = await result;
    assert.equal(counted.filter(Boolean).length, 0);
    assert.ok(error instanceof PassCliError);
    assert.equal(error.type, "not_authenticated");
  });
}

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
        endedSessionError: async () => undefined,
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
      endedSessionError: async () => undefined,
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
        useEffect: () => undefined,
      },
      "./item-icon": { getListIcon: () => "" },
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
      "./utils": {
        getItemIcon: () => "",
        getTotpRemainingSeconds: () => 30,
        totpCircle: () => "circle",
        totpProgressIcon: () => "circle",
        totpTimerColor: () => "",
      },
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
    "./item-icon": { getListIcon: () => "" },
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
    "./utils": {
      getItemIcon: () => "",
      getTotpRemainingSeconds: () => 30,
      totpCircle: () => "circle",
      totpProgressIcon: () => "circle",
      totpTimerColor: () => "",
    },
  });
  const render = (items: Item[], suggestedItems: Item[] = [], props: Record<string, unknown> = {}) =>
    harness.render(ItemList, { items, suggestedItems, isLoading: false, emptyView: {}, ...props });
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
        localTotpCode: () => undefined,
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
      // Fixed-width digits are checked in format.test.ts; plain ones keep these assertions readable.
      "./lib/format": { itemKey: format.itemKey, monospace: (text: string) => text },
      "./lib/item-icon": { getListIcon: () => "" },
      "./lib/shortcuts": shortcuts,
      "@raycast/utils": { useFrecencySorting: (items: Item[]) => ({ data: items, visitItem: () => undefined }) },
      "./lib/utils": {
        getTotpRemainingSeconds: () => 30,
        totpProgressIcon: () => "",
        totpTimerColor: () => "",
        getItemIcon: () => "",
        formatTotpCode: (code: string) => code,
        hiddenTotpCode: (code: string) => "•".repeat(code.length),
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
  localTotpCode: (shareId: string, itemId: string) => string | undefined = () => undefined,
  cachedItems: Item[] | null = null,
  preferences: Record<string, unknown> = {},
) {
  const harness = hookHarness();
  const toasts: { primaryAction: { onAction: () => Promise<void> } }[] = [];
  const writes: Item[][] = [];
  const copied: string[] = [];
  const visited: Item[] = [];
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
        getPreferenceValues: () => preferences,
        Clipboard: {
          copy: async (value: string) => {
            copied.push(value);
          },
        },
        showToast: async (toast: (typeof toasts)[number]) => {
          toasts.push(toast);
        },
      },
      "./lib/pass-cli": { listVaultsAndItems, getTotp, localTotpCode },
      "./lib/types": { PassCliError },
      // Fixed-width digits are checked in format.test.ts; plain ones keep these assertions readable.
      "./lib/format": { itemKey: format.itemKey, monospace: (text: string) => text },
      "./lib/item-icon": { getListIcon: () => "" },
      "./lib/shortcuts": shortcuts,
      "@raycast/utils": {
        useFrecencySorting: (items: Item[]) => ({ data: items, visitItem: (entry: Item) => visited.push(entry) }),
      },
      "./lib/utils": {
        getTotpRemainingSeconds: () => 30,
        totpProgressIcon: () => "",
        totpTimerColor: () => "",
        getItemIcon: () => "",
        formatTotpCode: (code: string) => code,
        hiddenTotpCode: (code: string) => "•".repeat(code.length),
      },
      "./lib/cache": {
        getCachedItems: async () => (cachedItems ? { data: cachedItems } : null),
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
    visited,
    get clears() {
      return clears;
    },
    get savedItems() {
      return savedItems;
    },
  };
}

test("the TOTP countdown uses Raycast's own circles, in quarters, and turns from green to yellow to red with them", () => {
  const icons = {
    CircleProgress100: "100",
    CircleProgress75: "75",
    CircleProgress50: "50",
    CircleProgress25: "25",
    Circle: "empty",
  };
  const { totpProgressIcon, totpTimerColor } = loadView("utils.ts", {
    "@raycast/api": { Color: { Green: "green", Yellow: "yellow", Red: "red" }, Icon: icons },
  }) as unknown as {
    totpProgressIcon: (remaining: number, period: number, tint?: string) => unknown;
    totpTimerColor: (remaining: number, period?: number) => string;
  };
  assert.equal(
    [30, 23, 22, 16, 15, 8, 7, 1].map((seconds) => totpProgressIcon(seconds, 30)).join(),
    "100,100,75,75,50,50,25,25",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(totpProgressIcon(30, 30, "green"))), {
    source: "100",
    tintColor: "green",
  });
  assert.equal(
    [30, 16, 15, 8, 7, 1].map((seconds) => totpTimerColor(seconds)).join(),
    "green,green,yellow,yellow,red,red",
  );
  assert.equal([31, 30, 16, 15].map((seconds) => totpTimerColor(seconds, 60)).join(), "green,yellow,yellow,red");
});

test("logins show their initials, or their website's icon with Show Website Icons, in Browse Items and Get TOTP", () => {
  const favicons: string[] = [];
  const { getListIcon } = loadView("item-icon.ts", {
    "@raycast/api": { Image: { Mask: { RoundedRectangle: "rounded" } } },
    "@raycast/utils": {
      getFavicon: (url: string, options: { fallback: string }) => {
        favicons.push(url);
        return { favicon: url, fallback: options.fallback };
      },
    },
    "./avatar": { getInitialIconDataUri: (title: string) => `initials:${title}` },
    "./utils": { getItemIcon: (type: string) => `type:${type}` },
  }) as unknown as { getListIcon: (item: Item, showWebsiteIcons: boolean) => unknown };
  // Plain copies: objects made in the module's context don't share this one's prototypes.
  const iconOf = (entry: Item, showWebsiteIcons: boolean) =>
    JSON.parse(JSON.stringify(getListIcon(entry, showWebsiteIcons)));
  const login = { ...item, type: "login" as const, urls: ["example.com/login"] };
  assert.deepEqual(iconOf(login, false), { source: `initials:${login.title}`, fallback: "type:login" });
  assert.deepEqual(iconOf(login, true), {
    favicon: "https://example.com/login",
    fallback: `initials:${login.title}`,
  });
  assert.deepEqual(iconOf({ ...login, urls: [] }, true), {
    source: `initials:${login.title}`,
    fallback: "type:login",
  });
  assert.equal(iconOf({ ...item, type: "note" }, true), "type:note");
  assert.deepEqual(favicons, ["https://example.com/login"]);
});

test("TOTP codes have their halves set apart like Proton Authenticator's, and longer codes stay whole", () => {
  const { formatTotpCode } = loadView("utils.ts", { "@raycast/api": { Color: {}, Icon: {} } }) as unknown as {
    formatTotpCode: (code: string) => string;
  };
  assert.equal(formatTotpCode("123456"), "123\u2002456");
  assert.equal(formatTotpCode("12345678"), "12345678");
});

test("hidden TOTP codes have one dot per digit, since Raycast spaces out each character of a tag", () => {
  const { hiddenTotpCode } = loadView("utils.ts", { "@raycast/api": { Color: {}, Icon: {} } }) as unknown as {
    hiddenTotpCode: (code: string) => string;
  };
  assert.equal(hiddenTotpCode("123456"), "⦁⦁⦁\u2005⦁⦁⦁");
  assert.equal(hiddenTotpCode("123456").length, "123\u2002456".length);
  assert.equal(hiddenTotpCode("12345678"), "⦁⦁⦁⦁⦁⦁⦁⦁");
});

test("Get TOTP Code generates codes from the listing instead of asking pass-cli for each item", async () => {
  let asked = 0;
  const fixture = totpCommandFixture(
    async () => ({ items: [{ ...item, hasTotp: true }], failedVaults: [] }),
    async () => {
      asked++;
      return "123456";
    },
    undefined,
    {},
    () => "654321",
  );
  await new Promise(setImmediate);
  const row = actions(fixture.render()).find((entry) => entry.title === item.title);
  assert.equal((row?.accessories as { tag: { value: string } }[] | undefined)?.[0].tag.value, "654321");
  assert.equal(asked, 0);
});

test("Sort by puts names in alphabetical order, and dates newest first with undated items last", () => {
  const sortItems = sort.sortItems as unknown as (items: Item[], order: string, mostUsed: Item[]) => Item[];
  const titles = (items: Item[]) => items.map((entry) => entry.title).join();
  const items = [
    { ...item, title: "item 10", modifiedAt: "2026-01-01T00:00:00.000Z", createdAt: "2025-01-01T00:00:00.000Z" },
    { ...item, title: "Été", modifiedAt: "2025-06-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
    { ...item, title: "item 9" },
  ];
  assert.equal(titles(sortItems(items, "name", [])), "Été,item 9,item 10");
  assert.equal(titles(sortItems(items, "modified", [])), "item 10,Été,item 9");
  assert.equal(titles(sortItems(items, "created", [])), "Été,item 10,item 9");
  assert.equal(sortItems(items, "mostUsed", items.slice(1)).length, 2);
});

test("Sort by changes Browse Items' order, and holds for the item lists opened next from the same window", () => {
  const sortChoice = { current: "mostUsed" };
  const items = [
    { ...item, itemId: "b", title: "Beta", modifiedAt: "2026-01-01T00:00:00.000Z" },
    { ...item, itemId: "a", title: "Alpha", modifiedAt: "2025-01-01T00:00:00.000Z" },
  ];
  const titles = (list: Element) => (list.props.children as Element[]).map((row) => row.props.title).join();
  const first = loadItemList();
  const list = first.render(items, [], { sortChoice });
  assert.equal(titles(list), "Beta,Alpha");
  const menu = (list.props.children as Element[])[0].props.actions as Element;
  assert.equal(menu.props.sortOrder, "mostUsed");
  (menu.props.onSortOrderChange as (order: string) => void)("name");
  assert.equal(titles(first.render(items, [], { sortChoice })), "Alpha,Beta");
  assert.equal(sortChoice.current, "name");
  // A vault opened next from the vault list starts in the order chosen.
  assert.equal(titles(loadItemList().render(items, [], { sortChoice })), "Alpha,Beta");
});

test("Get TOTP Code sorts like Browse Items, and a copied code counts as a use", async () => {
  const fixture = totpCommandFixture(
    async () => ({
      items: [
        { ...item, itemId: "b", title: "Beta", hasTotp: true },
        { ...item, itemId: "a", title: "Alpha", hasTotp: true },
      ],
      failedVaults: [],
    }),
    undefined,
    undefined,
    {},
    () => "654321",
  );
  await new Promise(setImmediate);
  const rows = () => actions(fixture.render()).filter((entry) => entry.accessories);
  assert.equal(
    rows()
      .map((row) => row.title)
      .join(),
    "Beta,Alpha",
  );
  const sortMenu = actions(rows()[0].actions).find((entry) => "onChange" in entry && "value" in entry)!;
  assert.equal(sortMenu.value, "mostUsed");
  (sortMenu.onChange as (order: string) => void)("name");
  assert.equal(
    rows()
      .map((row) => row.title)
      .join(),
    "Alpha,Beta",
  );
  await (
    actions(rows()[0].actions).find((entry) => entry.title === "Copy TOTP Code")!.onAction as () => Promise<void>
  )();
  assert.deepEqual(
    fixture.visited.map((entry) => entry.itemId),
    ["a"],
  );
});

test("Get TOTP Code has Browse Items' vault menu, with the vaults that have codes and their counts", async () => {
  const fixture = totpCommandFixture(
    async () => ({
      items: [
        { ...item, itemId: "a", title: "Alpha", hasTotp: true },
        { ...item, shareId: "work", vaultName: "Work", itemId: "b", title: "Beta", hasTotp: true },
        { ...item, shareId: "work", vaultName: "Work", itemId: "c", title: "Gamma", hasTotp: true },
        {
          ...item,
          shareId: "share-1",
          vaultName: "Unknown Vault",
          itemId: "d",
          title: "Delta",
          hasTotp: true,
          sharedWithMe: true,
        },
        { ...item, shareId: "empty", vaultName: "No Codes", itemId: "e", title: "Epsilon" },
      ],
      failedVaults: [],
    }),
    undefined,
    undefined,
    {},
    () => "654321",
  );
  await new Promise(setImmediate);
  const menu = () =>
    (fixture.render().props.searchBarAccessory as Element).props as {
      vaults: Vault[];
      itemCounts: Map<string, number>;
      onVaultChange: (shareId: string) => void;
    };
  const titles = () =>
    actions(fixture.render())
      .filter((entry) => entry.accessories)
      .map((row) => row.title)
      .join();
  assert.equal(
    menu()
      .vaults.map((vault) => vault.name)
      .join(),
    "Personal,Work,Shared with Me",
  );
  // Arrays made in the module's context: compared as text.
  assert.equal(Array.from(menu().itemCounts.values()).join(), "1,2,1");
  assert.equal(titles(), "Alpha,Beta,Gamma,Delta");
  menu().onVaultChange("work");
  assert.equal(titles(), "Beta,Gamma");
  menu().onVaultChange(menu().vaults[2].shareId);
  assert.equal(titles(), "Delta");
});

test("Hide Codes shows dots instead of the codes until Show Codes, and copying still gives the code", async () => {
  for (const hideCodes of [false, true]) {
    const fixture = totpCommandFixture(
      async () => ({ items: [{ ...item, hasTotp: true }], failedVaults: [] }),
      undefined,
      undefined,
      {},
      () => "654321",
      null,
      { hideCodes },
    );
    await new Promise(setImmediate);
    const row = () => actions(fixture.render()).find((entry) => entry.title === item.title)!;
    const tag = () => (row().accessories as { tag: { value: string } }[])[0].tag.value;
    const action = (title: string) => actions(row().actions).find((entry) => entry.title === title);
    assert.equal(tag(), hideCodes ? "••••••" : "654321");
    assert.equal(Boolean(action("Show Codes")), hideCodes);
    await (action("Copy TOTP Code")!.onAction as () => Promise<void>)();
    assert.deepEqual(fixture.copied, ["654321"]);
    if (!hideCodes) continue;
    (action("Show Codes")!.onAction as () => void)();
    assert.equal(tag(), "654321");
    (action("Hide Codes")!.onAction as () => void)();
    assert.equal(tag(), "••••••");
  }
});

test("a new TOTP period during the listing waits for it instead of asking pass-cli for each cached item", async () => {
  let now = 0;
  let tick!: () => void;
  let asked = 0;
  let listed = false;
  let finishListing!: () => void;
  const listing = new Promise<void>((resolve) => {
    finishListing = resolve;
  });
  const fixture = totpCommandFixture(
    async () => {
      await listing;
      listed = true;
      return { items: [{ ...item, hasTotp: true }], failedVaults: [] };
    },
    async () => {
      asked++;
      return "123456";
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
    // Codes are only generated here for listed items.
    () => (listed ? "654321" : undefined),
    [{ ...item, hasTotp: true }],
  );
  await new Promise(setImmediate);
  const loading = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  assert.equal((loading.accessories as { tag: { value: string } }[])[0].tag.value, "Loading…");
  now = 30_000;
  tick();
  finishListing();
  await new Promise(setImmediate);
  const row = actions(fixture.render()).find((entry) => entry.title === item.title)!;
  assert.equal((row.accessories as { tag: { value: string } }[])[0].tag.value, "654321");
  assert.equal(asked, 0);
});

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
  assert.equal((expiredRow.accessories as { tag: { value: string } }[])[0].tag.value, "Unavailable");
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
  assert.equal((updated.accessories as { tag: { value: string } }[])[0].tag.value, "Unavailable");
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
      endedSessionError: async () => undefined,
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

function searchItemsFixture(services: { "./pass-cli": unknown; "./cache": unknown; "./item-counts"?: unknown }) {
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
    ...services,
  });
  return { harness, SearchItemsView };
}

test("an ended session shows the login screen at once, without showing the saved items first", async () => {
  let shownSaved = false;
  let listings = 0;
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      endedSessionError: async () => new PassCliError("Not authenticated.", "not_authenticated"),
      listItems: async () => [],
      listVaultsAndItems: async () => {
        listings++;
        return { vaults: [], items: [], failedVaults: [] };
      },
    },
    "./cache": {
      getCachedItems: async () => ({ data: [item], isStale: false }),
      getCachedVaults: async () => ({ data: [{ shareId: "vault", name: "Personal" }], isStale: false }),
    },
    "./item-counts": {
      ...itemCounts,
      // Counted when the saved items show.
      countItemsByVault: (...args: Parameters<typeof itemCounts.countItemsByVault>) => {
        shownSaved = true;
        return itemCounts.countItemsByVault(...args);
      },
    },
  });
  const render = () => harness.render(SearchItemsView, {});
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(shownSaved, false);
  assert.equal(listings, 0);
  // NotLoggedInView, which reloads once logged in.
  assert.equal(typeof render().props.reload, "function");
});

test("a slow session check doesn't hold the saved items back, and an ended session still shows the login screen", async () => {
  let shownSaved = false;
  let listings = 0;
  let endSession: (error: PassCliError) => void = () => undefined;
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      SESSION_CHECK_WAIT_MS: 5,
      endedSessionError: () =>
        new Promise((resolve) => {
          endSession = resolve;
        }),
      listItems: async () => [],
      listVaultsAndItems: async () => {
        listings++;
        return { vaults: [], items: [], failedVaults: [] };
      },
    },
    "./cache": {
      getCachedItems: async () => ({ data: [item], isStale: false }),
      getCachedVaults: async () => ({ data: [{ shareId: "vault", name: "Personal" }], isStale: false }),
    },
    "./item-counts": {
      ...itemCounts,
      // Counted when the saved items show.
      countItemsByVault: (...args: Parameters<typeof itemCounts.countItemsByVault>) => {
        shownSaved = true;
        return itemCounts.countItemsByVault(...args);
      },
    },
  });
  const render = () => harness.render(SearchItemsView, {});
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(shownSaved, true);
  // The listing waits for the answer.
  assert.equal(listings, 0);

  endSession(new PassCliError("Not authenticated.", "not_authenticated"));
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  assert.equal(typeof render().props.reload, "function");
  assert.equal(listings, 0);
});

test("an item list opened from the vault list once the session is confirmed doesn't ask pass-cli again", async () => {
  let checks = 0;
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      endedSessionError: async () => {
        checks++;
        return undefined;
      },
      listItems: async () => [],
      // Still listing: the saved items are on screen.
      listVaultsAndItems: () => new Promise(() => undefined),
    },
    "./cache": {
      getCachedItems: async () => ({ data: [item], isStale: false }),
      getCachedVaults: async () => ({ data: [{ shareId: "vault", name: "Personal" }], isStale: false }),
    },
  });
  const props = { initialVault: { shareId: "vault", name: "Personal" }, sessionConfirmed: true };
  harness.render(SearchItemsView, props);
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(checks, 0);
  // The saved items show at once, rather than after pass-cli answers.
  assert.equal((harness.render(SearchItemsView, props).props.items as Item[]).length, 1);
});

test("Shared with Me opened with nothing saved waits for the vaults, rather than showing items that then move", async () => {
  const previewed = async (initialVault: Vault) => {
    const shareIds: string[] = [];
    const { harness, SearchItemsView } = searchItemsFixture({
      "./pass-cli": {
        endedSessionError: async () => undefined,
        listItems: async (shareId: string) => {
          shareIds.push(shareId);
          return [{ ...item, shareId }];
        },
        listVaultsAndItems: () => new Promise(() => undefined),
      },
      "./cache": {
        getCachedItems: async () => null,
        getCachedVaults: async () => null,
      },
    });
    harness.render(SearchItemsView, { initialVault, sessionConfirmed: true });
    harness.effects.forEach((effect) => effect());
    await new Promise(setImmediate);
    return shareIds.join();
  };
  assert.equal(await previewed({ shareId: "vault", name: "Personal" }), "vault");
  // An item shared with the user that is also in one of their vaults shows with that vault only.
  assert.equal(await previewed(sharedItems.SHARED_WITH_ME), "");
});

test("the vault list passes on a session it confirmed to the item lists it opens", async () => {
  const harness = hookHarness();
  const { VaultsView } = loadView("vaults-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
      useNavigation: () => ({ push: () => undefined }),
    },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listVaultSharing: async () => new Map(),
      listVaultsAndItems: async () => ({
        vaults: [{ shareId: "vault", name: "Personal" }, sharedItems.SHARED_WITH_ME],
        items: [{ ...item, shareId: "item-share", sharedWithMe: true }],
        failedVaults: [],
      }),
    },
    "./types": { PassCliError },
    "./search-items-view": {},
    "./error-views": {},
    "./login-view": {},
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      getCachedSharing: async () => null,
      setCachedSharing: async () => undefined,
      setCachedItems: async () => undefined,
      setCachedVaults: async () => undefined,
    },
    "./item-counts": itemCounts,
    "./refresh": refresh,
    "./shortcuts": shortcuts,
    "./vault-sharing": vaultSharing,
  });
  const confirmed = () =>
    actions(harness.render(VaultsView, { startOnItems: false }))
      .flatMap((entry) => (entry.actions ? actions(entry.actions) : []))
      .filter((entry) => entry.title === "View Items")
      .map((entry) => (entry.target as Element).props.sessionConfirmed);
  harness.render(VaultsView, { startOnItems: false });
  const [load] = harness.effects;
  load();
  await new Promise(setImmediate);
  // All Vaults, the vault and Shared with Me.
  assert.equal(confirmed().join(), "true,true,true");
});

test("the vault list shows and saves items before optional sharing, from complete listings only", async () => {
  const personal = { shareId: "vault", name: "Personal" };
  const added = { shareId: "added", name: "Added" };
  const saved: string[] = [];
  const pendingSharing: ((sharing: Map<string, unknown>) => void)[] = [];
  let failing = true;
  const harness = hookHarness();
  const { VaultsView } = loadView("vaults-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
      useNavigation: () => ({ push: () => undefined }),
    },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listVaultSharing: () => new Promise((resolve) => pendingSharing.push(resolve)),
      listVaultsAndItems: async () => ({
        vaults: [personal, added],
        items: [item],
        failedVaults: failing ? [{ vault: added, message: "Offline" }] : [],
      }),
    },
    "./types": { PassCliError },
    "./search-items-view": {},
    "./error-views": {},
    "./login-view": {},
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      getCachedSharing: async () => null,
      setCachedSharing: async () => {
        saved.push("sharing");
      },
      setCachedItems: async () => {
        saved.push("items");
      },
      setCachedVaults: async () => {
        saved.push("vaults");
      },
    },
    "./item-counts": itemCounts,
    "./refresh": refresh,
    "./shortcuts": shortcuts,
    "./vault-sharing": vaultSharing,
  });
  harness.render(VaultsView, { startOnItems: false });
  const [load] = harness.effects;
  load();
  await new Promise(setImmediate);
  const view = harness.render(VaultsView, { startOnItems: false });
  assert.equal(view.props.isLoading, false);
  const row = actions(view).find((entry) => entry.title === personal.name)!;
  assert.ok(row);
  assert.deepEqual(JSON.parse(JSON.stringify(row.accessories)), [{ text: "1 item" }]);
  assert.deepEqual(saved, []);
  pendingSharing[0](new Map([["vault", { role: "owner", isShared: true }]]));
  await new Promise(setImmediate);
  const sharedRow = actions(harness.render(VaultsView, { startOnItems: false })).find(
    (entry) => entry.title === personal.name,
  )!;
  assert.deepEqual(JSON.parse(JSON.stringify(sharedRow.accessories)), [
    { tooltip: "Shared by you" },
    { text: "1 item" },
  ]);
  // Saved without its items, the vault that failed would count 0 items on the next open.
  assert.deepEqual(saved, ["sharing"]);

  failing = false;
  load();
  await new Promise(setImmediate);
  assert.deepEqual(saved.sort(), ["items", "sharing", "vaults"]);
  pendingSharing[1](new Map([["vault", { role: "owner", isShared: true }]]));
  await new Promise(setImmediate);
  assert.deepEqual(saved.sort(), ["items", "sharing", "sharing", "vaults"]);
});

test("Sort vaults by puts vaults by name or by item count, the uncounted last", () => {
  const sortVaults = sort.sortVaults as unknown as (
    vaults: Vault[],
    order: string,
    countOf: (vault: Vault) => number | undefined,
    mostUsed: Vault[],
  ) => Vault[];
  const vaults = [
    { shareId: "w", name: "work" },
    { shareId: "p", name: "Personal" },
    { shareId: "a", name: "Archive" },
  ];
  const counts = new Map([
    ["w", 12],
    ["p", 40],
  ]);
  const names = (order: string) =>
    sortVaults(vaults, order, (vault) => counts.get(vault.shareId), vaults.slice(1))
      .map((vault) => vault.name)
      .join();
  assert.equal(names("name"), "Archive,Personal,work");
  assert.equal(names("itemCount"), "Personal,work,Archive");
  assert.equal(names("mostUsed"), "Personal,Archive");
});

test("the vault menu follows the vaults' order, and only a vault chosen in it counts as a use", () => {
  const visits: string[] = [];
  const changes: string[] = [];
  const { VaultDropdown } = loadView("vault-dropdown.tsx", {
    react: { useRef: (current: unknown) => ({ current }) },
    "@raycast/api": { List: { Dropdown: { Item: {}, Section: {} } }, Icon: {} },
    "./item-counts": itemCounts,
    "./sort": {
      ...sort,
      useVaultFrecency: (data: Vault[]) => ({ data, visitItem: (vault: Vault) => visits.push(vault.shareId) }),
    },
  });
  const menu = VaultDropdown({
    vaults: [{ shareId: "w", name: "Work" }, { shareId: "p", name: "Personal" }, sharedItems.SHARED_WITH_ME],
    itemCounts: new Map([
      ["w", 3],
      ["p", 1],
    ]),
    order: "itemCount",
    onVaultChange: (shareId: string) => changes.push(shareId),
  } as unknown as Record<string, unknown>);
  assert.equal(
    actions(menu)
      .filter((entry) => typeof entry.value === "string")
      .map((entry) => entry.value)
      .join(),
    "all,w,p,shared-with-me",
  );
  const onChange = menu.props.onChange as (shareId: string) => void;
  // The vault Raycast opens on, then one the user picks.
  onChange("w");
  onChange("p");
  assert.equal(changes.join(), "w,p");
  assert.equal(visits.join(), "p");
});
test("the vault list is sorted by name by default, and Sort by or its search bar menu reorders it and the vault menus opened from it", async () => {
  const harness = hookHarness();
  const { VaultsView } = loadView("vaults-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
      useNavigation: () => ({ push: () => undefined }),
    },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listVaultSharing: async () => new Map(),
      listVaultsAndItems: async () => ({
        vaults: [
          { shareId: "b", name: "Beta" },
          { shareId: "a", name: "Alpha" },
        ],
        items: [
          { ...item, shareId: "b", itemId: "1" },
          { ...item, shareId: "b", itemId: "2" },
          { ...item, shareId: "a", itemId: "3" },
        ],
        failedVaults: [],
      }),
    },
    "./types": { PassCliError },
    "./search-items-view": {},
    "./error-views": {},
    "./login-view": {},
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      getCachedSharing: async () => null,
      setCachedSharing: async () => undefined,
      setCachedItems: async () => undefined,
      setCachedVaults: async () => undefined,
    },
    "./item-counts": itemCounts,
    "./refresh": refresh,
    "./shortcuts": shortcuts,
    "./vault-sharing": vaultSharing,
  });
  harness.render(VaultsView, { startOnItems: false });
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  const rows = () =>
    actions(harness.render(VaultsView, { startOnItems: false })).filter(
      (entry) => entry.actions && entry.title !== "All Vaults",
    );
  assert.equal(
    rows()
      .map((row) => row.title)
      .join(),
    "Alpha,Beta",
  );
  const sortMenu = actions(rows()[0].actions).find((entry) => "onChange" in entry && "value" in entry)!;
  assert.equal(sortMenu.value, "name");
  (sortMenu.onChange as (order: string) => void)("itemCount");
  assert.equal(
    rows()
      .map((row) => row.title)
      .join(),
    "Beta,Alpha",
  );
  // The item lists opened from here show their vault menu in the same order.
  const open = actions(rows()[0].actions).find((entry) => entry.title === "View Items")!;
  assert.equal((open.target as Element).props.vaultOrder, "itemCount");
  // The search bar menu shows the same order and changes it too.
  const dropdown = harness.render(VaultsView, { startOnItems: false }).props.searchBarAccessory as Element;
  assert.equal(dropdown.props.value, "itemCount");
  (dropdown.props.onChange as (order: string) => void)("name");
  assert.equal(
    rows()
      .map((row) => row.title)
      .join(),
    "Alpha,Beta",
  );
});

test("an older vault list load can't replace newer sharing or displayed counts", async () => {
  const vault = { shareId: "vault", name: "Personal" };
  const savedSharing: unknown[] = [];
  const pending: ((sharing: Map<string, unknown>) => void)[] = [];
  let listings = 0;
  const harness = hookHarness();
  const { VaultsView } = loadView("vaults-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
      useNavigation: () => ({ push: () => undefined }),
    },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listVaultSharing: () => new Promise((resolve) => pending.push(resolve)),
      listVaultsAndItems: async () => ({
        vaults: [vault],
        items: ++listings === 1 ? [item] : [item, { ...item, itemId: "second" }],
        failedVaults: [],
      }),
    },
    "./types": { PassCliError },
    "./search-items-view": {},
    "./error-views": {},
    "./login-view": {},
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      getCachedSharing: async () => null,
      setCachedSharing: async (sharing: unknown) => {
        savedSharing.push(sharing);
      },
      setCachedItems: async () => undefined,
      setCachedVaults: async () => undefined,
    },
    "./item-counts": itemCounts,
    "./refresh": refresh,
    "./shortcuts": shortcuts,
    "./vault-sharing": vaultSharing,
  });
  harness.render(VaultsView, { startOnItems: false });
  const [load] = harness.effects;
  load();
  await new Promise(setImmediate);
  load();
  await new Promise(setImmediate);

  // The newer load finishes first, then the older one.
  pending[1](new Map([["vault", { role: "viewer", isShared: true }]]));
  await new Promise(setImmediate);
  pending[0](new Map([["vault", { role: "owner", isShared: false }]]));
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(JSON.stringify(savedSharing)), [{ vault: { role: "viewer", isShared: true } }]);
  const row = actions(harness.render(VaultsView, { startOnItems: false })).find((entry) => entry.title === vault.name)!;
  assert.deepEqual(JSON.parse(JSON.stringify(row.accessories)), [
    { tooltip: "Shared with you · Viewer" },
    { text: "2 items" },
  ]);
});

test("List Vaults opens Browse Items on the vault list, and says so when Browse Items is disabled", async () => {
  const { default: BrowseItems } = loadView("../search-items.tsx", { "./lib/vaults-view": { VaultsView: {} } });
  assert.equal(BrowseItems({}).props.startOnItems, true);
  assert.equal(BrowseItems({ launchContext: { openOn: "vaults" } }).props.startOnItems, false);
  const launched: unknown[] = [];
  const toasts: { title: string }[] = [];
  let isEnabled = true;
  const { default: ListVaults } = loadView("../list-vaults.tsx", {
    "@raycast/api": {
      LaunchType: { UserInitiated: "userInitiated" },
      Toast: { Style: { Failure: "failure" } },
      launchCommand: async (options: unknown) => {
        if (!isEnabled) throw new Error("Command is disabled");
        launched.push(options);
      },
      showToast: async (toast: { title: string }) => {
        toasts.push(toast);
      },
    },
    "./search-items": {},
  });
  await ListVaults({});
  assert.deepEqual(JSON.parse(JSON.stringify(launched)), [
    { name: "search-items", type: "userInitiated", context: { openOn: "vaults" } },
  ]);
  isEnabled = false;
  await ListVaults({});
  assert.equal(toasts[0].title, "Couldn't Open Browse Items");
});

test("Browse Items opens all items over the vaults, which load only once they're shown", async () => {
  const pushed: { view: Element; onPop?: () => void }[] = [];
  let listings = 0;
  const harness = hookHarness();
  const { VaultsView } = loadView("vaults-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      List: { Item: {}, EmptyView: {} },
      ActionPanel: {},
      Action: { Push: {}, CopyToClipboard: {}, OpenInBrowser: {} },
      Icon: {},
      Keyboard: { Shortcut: { Common: { Copy: {} } } },
      getPreferenceValues: () => ({}),
      useNavigation: () => ({
        push: (view: Element, onPop?: () => void) => {
          pushed.push({ view, onPop });
        },
      }),
    },
    "./pass-cli": {
      endedSessionError: async () => undefined,
      listVaultSharing: async () => new Map(),
      listVaultsAndItems: async () => {
        listings++;
        return { vaults: [{ shareId: "vault", name: "Personal" }], items: [item], failedVaults: [] };
      },
    },
    "./types": { PassCliError },
    "./search-items-view": {},
    "./error-views": {},
    "./login-view": {},
    "./cache": {
      getCachedItems: async () => null,
      getCachedVaults: async () => null,
      getCachedSharing: async () => null,
      setCachedSharing: async () => undefined,
      setCachedItems: async () => undefined,
      setCachedVaults: async () => undefined,
    },
    "./item-counts": itemCounts,
    "./refresh": refresh,
    "./shortcuts": shortcuts,
    "./vault-sharing": vaultSharing,
  });
  const render = () => harness.render(VaultsView, { startOnItems: true });
  render();
  // Twice, as React does in development: a second copy of the items would take a second Esc to leave.
  harness.effects.forEach((effect) => effect());
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  // All items, rather than a vault, and nothing listed for the vaults underneath meanwhile.
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].view.props.initialVault, undefined);
  assert.equal(listings, 0);

  pushed[0].onPop?.();
  await new Promise(setImmediate);
  assert.equal(listings, 1);
  const rows = (render().props.children as { props: { children: unknown[] } }).props.children.flat();
  const titles = rows.flatMap((row) => (row && typeof row === "object" ? [(row as Element).props.title] : []));
  assert.equal(titles.join(", "), "All Vaults, Personal");
});

test("a vault opened from the vault list keeps its count when its items can't be listed", async () => {
  const failed = { shareId: "vault", name: "Personal" };
  const { harness, SearchItemsView } = searchItemsFixture({
    "./pass-cli": {
      endedSessionError: async () => undefined,
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

test("Check Again in Search Items keeps the login screen until the items have loaded", async () => {
  const harness = hookHarness();
  const vault = { shareId: "vault", name: "Personal" };
  let isLoggedIn = false;
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
      endedSessionError: async () => undefined,
      listVaultsAndItems: async () => {
        if (!isLoggedIn) throw new PassCliError("Session ended", "not_authenticated");
        return { vaults: [vault], items: [item], failedVaults: [] };
      },
    },
    "./types": { PassCliError },
    "./cache": {
      getCachedItems: async () => ({ data: [item], timestamp: 0, isStale: true }),
      getCachedVaults: async () => ({ data: [vault], timestamp: 0, isStale: true }),
      setCachedItems: async () => undefined,
      setCachedVaults: async () => undefined,
    },
    "./error-views": { renderErrorView: (type: unknown) => (type ? { props: { error: type } } : null) },
    "./login-view": {},
    "./format": {},
    "./item-list": {},
    "./refresh": refresh,
    "./item-counts": itemCounts,
  });
  const render = () => harness.render(SearchItemsView, {});
  render();
  harness.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  const notLoggedIn = render();
  assert.equal(typeof notLoggedIn.props.reload, "function");

  isLoggedIn = true;
  const checking = (notLoggedIn.props.reload as () => Promise<void>)();
  // No empty list, nor the ended session's vaults, while the items load.
  assert.equal(typeof render().props.reload, "function");
  assert.equal("items" in render().props, false);

  await checking;
  assert.deepEqual(render().props.items, [item]);
});

test("Login with Browser shows what's left to do, then reloads once the login succeeded", async () => {
  const harness = hookHarness();
  const url = "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";
  const statuses: unknown[] = [{ state: "none" }, { state: "succeeded" }];
  let reloads = 0;
  let finishReload = () => {};
  const reload = () => {
    reloads++;
    return new Promise<void>((done) => {
      finishReload = done;
    });
  };
  const { NotLoggedInView, LoginScreen } = loadView("login-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      Action: { OpenInBrowser: {}, Style: { Destructive: "destructive" } },
      ActionPanel: {},
      Icon: {},
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      List: { EmptyView: {} },
      Toast: { Style: { Success: "success" } },
      showToast: async () => ({ hide: async () => undefined }),
    },
    "./core/login": {},
    "./pass-cli": {
      startBrowserLogin: async () => url,
      checkBrowserLogin: async () => statuses.shift(),
      cancelBrowserLogin: async () => undefined,
    },
    "./shortcuts": shortcuts,
    "./terminal": { openTerminalForLogin: () => undefined },
    "./types": { PassCliError, PROTON_PASS_CLI_DOCS: "https://example.com/docs" },
  });
  const screen = () => LoginScreen(harness.render(NotLoggedInView, { reload }).props);
  // The empty view holds its actions in a prop rather than in its children.
  const tree = (element: unknown): Element["props"][] =>
    actions(element).flatMap((props) => [props, ...(props.actions ? tree(props.actions) : [])]);
  const action = (title: string) => tree(screen()).find((props) => props.title === title);

  screen();
  const [checkLogin] = harness.effects;
  checkLogin();
  await new Promise(setImmediate);
  await (action("Login with Browser")?.onAction as () => Promise<void>)();

  const title = () => tree(screen()).find((props) => "description" in props)?.title;
  assert.equal(title(), "Log In in Your Browser");
  assert.equal(action("Open Login Page Again")?.url, url);
  assert.equal(reloads, 0);

  // The view checks on the login while it waits.
  checkLogin();
  await new Promise(setImmediate);
  assert.equal(reloads, 1);
  // Rather than an empty list, until the view has loaded.
  assert.equal(title(), "You're Logged In");

  // Still on screen once the view has loaded, the login didn't hold: the actions are back.
  finishReload();
  await new Promise(setImmediate);
  assert.equal(title(), "Not Logged In");
  assert.equal(typeof action("Login with Browser")?.onAction, "function");
});

test("a login started while a check is in flight lets it finish, and keeps its own status", async () => {
  const harness = hookHarness();
  const events: string[] = [];
  let finishCheck: (status: unknown) => void = () => undefined;
  const { NotLoggedInView } = loadView("login-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      Action: { OpenInBrowser: {}, Style: { Destructive: "destructive" } },
      ActionPanel: {},
      Icon: {},
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      List: { EmptyView: {} },
      Toast: { Style: { Success: "success" } },
      showToast: async () => ({ hide: async () => undefined }),
    },
    "./core/login": {},
    "./pass-cli": {
      startBrowserLogin: async () => {
        events.push("start login");
        return "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";
      },
      checkBrowserLogin: () => {
        events.push("check");
        return new Promise((resolve) => {
          finishCheck = (status) => {
            events.push("check done");
            resolve(status);
          };
        });
      },
      cancelBrowserLogin: async () => undefined,
    },
    "./shortcuts": shortcuts,
    "./terminal": { openTerminalForLogin: () => undefined },
    "./types": { PassCliError, PROTON_PASS_CLI_DOCS: "https://example.com/docs" },
  });
  const login = () =>
    harness.render(NotLoggedInView, { reload: () => undefined }).props.login as {
      start: () => Promise<void>;
      status: { state: string };
    };

  login();
  const [checkLogin] = harness.effects;
  checkLogin();
  await new Promise(setImmediate);
  // Login with Browser pressed right away, while the check of an earlier login is still running.
  const starting = login().start();
  await new Promise(setImmediate);
  // That check would remove the new login's files, and report its own result over the new login's.
  assert.deepEqual(events, ["check"]);

  finishCheck({ state: "none" });
  await starting;
  assert.deepEqual(events, ["check", "check done", "start login"]);
  assert.equal(login().status.state, "waiting");
});

test("no check runs while a login is canceled, which would put it back on screen", async () => {
  const harness = hookHarness();
  const waiting = { state: "waiting", url: "https://account.proton.me/desktop/login?app=pass", isFinishing: false };
  let checks = 0;
  let finishCancel = () => {};
  const { NotLoggedInView } = loadView("login-view.tsx", {
    react: harness.react,
    "@raycast/api": {
      Action: { OpenInBrowser: {}, Style: { Destructive: "destructive" } },
      ActionPanel: {},
      Icon: {},
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      List: { EmptyView: {} },
      Toast: { Style: { Success: "success" } },
      showToast: async () => ({ hide: async () => undefined }),
    },
    "./core/login": {},
    "./pass-cli": {
      startBrowserLogin: async () => waiting.url,
      // Still running for the extension, until its files are removed.
      checkBrowserLogin: async () => {
        checks++;
        return waiting;
      },
      cancelBrowserLogin: () =>
        new Promise<void>((done) => {
          finishCancel = done;
        }),
    },
    "./shortcuts": shortcuts,
    "./terminal": { openTerminalForLogin: () => undefined },
    "./types": { PassCliError, PROTON_PASS_CLI_DOCS: "https://example.com/docs" },
  });
  const login = () =>
    harness.render(NotLoggedInView, { reload: () => undefined }).props.login as {
      cancel: () => Promise<void>;
      status: { state: string };
    };

  login();
  const [checkLogin] = harness.effects;
  checkLogin();
  await new Promise(setImmediate);
  assert.equal(login().status.state, "waiting");

  const canceling = login().cancel();
  await new Promise(setImmediate);
  // The view checks on the login every second while it waits.
  checkLogin();
  await new Promise(setImmediate);
  assert.equal(checks, 1);

  finishCancel();
  await canceling;
  assert.equal(login().status.state, "none");
});

test("no pass-cli command starts while a browser login is saving its session", async () => {
  let adapters = 0;
  const api = loadView("pass-cli.ts", {
    "@raycast/api": { environment: { isDevelopment: false, supportPath: "/fixture" }, getPreferenceValues: () => ({}) },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": { clearCache: async () => undefined },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => {
        adapters++;
        return { listVaults: async () => [], checkAuth: async () => true };
      },
    },
    "./core/login": { isDetachedLoginRunning: async () => true },
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as { listVaults: () => Promise<unknown>; checkAuth: () => Promise<boolean> };

  // pass-cli could log out "for security" and delete the session being saved.
  await assert.rejects(api.listVaults(), (error: unknown) => {
    assert.equal((error as PassCliError).type, "not_authenticated");
    return true;
  });
  await assert.rejects(api.checkAuth());
  assert.equal(adapters, 0);
});

test("a browser login clears the previous account's cache, and is canceled when the browser can't open", async () => {
  const events: string[] = [];
  const api = loadView("pass-cli.ts", {
    "@raycast/api": {
      environment: { isDevelopment: false, supportPath: "/fixture" },
      getPreferenceValues: () => ({}),
      open: async () => {
        throw new Error("No browser");
      },
    },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": {
      clearCache: async () => {
        events.push("clear cache");
      },
    },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {},
    "./core/login": {
      startDetachedLogin: async () => {
        events.push("start login");
        return "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";
      },
      cancelDetachedLogin: async () => {
        events.push("cancel login");
      },
    },
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as { startBrowserLogin: () => Promise<string | undefined> };

  await assert.rejects(api.startBrowserLogin(), /No browser/);
  // Nobody could finish that login, and while it ran, no other pass-cli command would.
  assert.deepEqual(events, ["clear cache", "start login", "cancel login"]);
});

test("Logout forgets the login that was over when it started, and only that one", async () => {
  const events: string[] = [];
  const api = loadView("pass-cli.ts", {
    "@raycast/api": {
      environment: { isDevelopment: false, supportPath: "/fixture" },
      getPreferenceValues: () => ({}),
    },
    "node:os": { homedir: () => "/fixture" },
    "node:path": { delimiter: ":", join: (...parts: string[]) => parts.join("/") },
    "./cache": {
      clearCache: async () => {
        events.push("clear cache");
      },
    },
    "./cli": { ensureCli: async () => "/fixture-cli" },
    "./core/adapter": {
      createPassCliAdapter: () => ({
        logout: async () => {
          events.push("log out");
        },
      }),
    },
    "./core/login": {
      isDetachedLoginRunning: async () => false,
      savedDetachedLogin: async () => ({ pid: 1, attempt: "ended", startedAt: 0 }),
      forgetDetachedLogin: async (_dir: string, login: { attempt: string }) => {
        events.push(`forget ${login.attempt}`);
      },
    },
    "./mock-data": {},
    "./types": { PassCliError },
  }) as unknown as { logout: () => Promise<void> };

  await api.logout();
  assert.deepEqual(events, ["log out", "clear cache", "forget ended"]);
});
