import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as refresh from "./refresh";
import * as shortcuts from "./shortcuts";
import { Item, PassCliError } from "./types";

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

function itemActions(confirmed: boolean) {
  const events: string[] = [];
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
      getPreferenceValues: () => ({}),
      confirmAlert: async () => {
        events.push("confirm");
        return confirmed;
      },
      Clipboard: {
        copy: async () => {
          events.push("copy");
        },
      },
      showToast: async () => undefined,
    },
    "./format": { websiteLabels: () => [] },
    "./note-view": {},
    "./shortcuts": shortcuts,
    "./use-totp-code": {},
  });
  const panel = ItemActions({
    item,
    store: { peek: () => ({ ...item, password: "fake-secret" }) },
    isShowingDetail: true,
    onToggleDetail: () => undefined,
    onUse: () => events.push("use"),
  });
  return { entries: actions(panel), events };
}

test("the new default password action confirms before copying and honors cancellation", async () => {
  for (const confirmed of [false, true]) {
    const { entries, events } = itemActions(confirmed);
    const password = entries.find((entry) => entry.title === "Copy Password");
    assert.ok(password);
    await (password.onAction as () => Promise<void>)();
    assert.deepEqual(events, confirmed ? ["confirm", "copy", "use"] : ["confirm"]);
  }
});

test("Copy Email and Copy Title have distinct Windows shortcuts", () => {
  const { entries } = itemActions(true);
  const shortcut = (title: string) =>
    (entries.find((entry) => entry.title === title)?.shortcut as { Windows: unknown }).Windows;
  assert.notEqual(JSON.stringify(shortcut("Copy Email")), JSON.stringify(shortcut("Copy Title")));
});

test("a failed full load keeps early vault items visible and offers a working Retry", async () => {
  const slots: unknown[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const toasts: { title: string; message: string; primaryAction: { onAction: () => void } }[] = [];
  let calls = 0;
  const cell = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return index;
  };
  const { SearchItemsView } = loadView("search-items-view.tsx", {
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
    cursor = 0;
    return SearchItemsView({ initialVault: { shareId: "vault", name: "Personal" } });
  };
  render();
  effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.deepEqual(render().props.items, [item]);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].title, "Failed to Load Items");
  assert.equal(toasts[0].message, "Network unavailable");
  assert.equal(calls, 1);
  toasts[0].primaryAction.onAction();
  await new Promise(setImmediate);
  assert.equal(calls, 2);
  assert.deepEqual(render().props.items, [item]);
});
