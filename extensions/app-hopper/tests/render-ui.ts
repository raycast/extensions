import createLoader from "./load-ts.ts";
import type { MockValue, MockModules } from "./load-ts.ts";

export type TestNode = { type: MockValue; props: Record<string, MockValue> };

function findAll(node: MockValue, predicate: (node: TestNode) => boolean): TestNode[] {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
  if (!node || typeof node !== "object") return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...findAll(node.props?.children, predicate),
    ...findAll(node.props?.actions, predicate),
  ];
}

function renderer(
  snapshot: Record<string, MockValue>,
  mocks: MockModules = {},
  file = "src/app-hopper.tsx",
  exportName = "default",
  props = {},
) {
  const component = (name: string) =>
    Object.assign(() => {}, {
      Item: `${name}.Item`,
      Section: `${name}.Section`,
      EmptyView: `${name}.EmptyView`,
      Push: `${name}.Push`,
    });
  const ui: Record<string, MockValue> = {
    Action: component("Action"),
    ActionPanel: component("ActionPanel"),
    List: component("List"),
    Detail: component("Detail"),
    Icon: { Minus: "minus", Tack: "tack", AppWindow: "app-window", MagnifyingGlass: "magnifying-glass" },
    Keyboard: { Shortcut: { Common: { Refresh: {} } } },
    Toast: { Style: { Failure: "failure" } },
    PopToRootType: { Immediate: "immediate" },
    closeMainWindow: async () => {},
    showToast: async () => {},
  };
  ui.List.Dropdown = component("List.Dropdown");
  Object.assign(ui, mocks["@raycast/api"]);
  let cursor = 0;
  const state: MockValue[] = [];
  let layoutEffects: (() => void)[] = [];
  const useState = (initial: MockValue) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [
      state[index],
      (value: MockValue) => {
        state[index] = typeof value === "function" ? value(state[index]) : value;
      },
    ];
  };
  const load = createLoader({
    "@raycast/utils": {
      useCachedState: (_key, initial) => useState(initial),
      useCachedPromise: (_load, _args, options) => ({
        data: options?.initialData ?? snapshot.browserWindows ?? [],
        isLoading: false,
        revalidate() {},
      }),
    },
    react: {
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useLayoutEffect: (effect) => layoutEffects.push(effect),
      useCallback: (fn) => fn,
      useRef: (initial) => useState(() => ({ current: initial }))[0],
      useState,
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "./use-window-search": {
      useWindowSearch: () => ({ ...snapshot, isLoading: false, setWindows() {}, refreshWindows() {} }),
    },
    "./firefox-integration": {},
    "./runtime-environment": {
      useRuntimeEnvironment: () => ({ status: { kind: "ready" }, revalidate() {} }),
    },
    ...mocks,
    "@raycast/api": ui,
  });
  const View = load(file)[exportName];
  const primitives = new Set(Object.values(ui));
  for (const module of Object.values(mocks)) {
    for (const value of Object.values(module)) primitives.add(value);
  }
  function renderChildren(node: MockValue): MockValue {
    if (Array.isArray(node)) return node.map(renderChildren);
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function" && !primitives.has(node.type)) return renderChildren(node.type(node.props));
    return {
      ...node,
      props: {
        ...node.props,
        children: renderChildren(node.props?.children),
        actions: renderChildren(node.props?.actions),
      },
    };
  }
  return {
    ui,
    render: (): TestNode => {
      cursor = 0;
      layoutEffects = [];
      const tree = renderChildren(View(props));
      for (const effect of layoutEffects) effect();
      return tree;
    },
  };
}

export { renderer, findAll };
