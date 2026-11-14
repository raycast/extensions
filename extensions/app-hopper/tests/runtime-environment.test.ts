import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

function environment(
  overrides: Partial<{
    platform: string;
    version: string;
    bundled: boolean;
    cached: boolean;
    tools: boolean;
    access: boolean;
    damaged: boolean;
    invalid: boolean;
  }> = {},
) {
  const state = {
    platform: "darwin",
    version: "27.2",
    bundled: true,
    cached: false,
    tools: false,
    access: true,
    ...overrides,
  };
  const calls: [string, string[]?][] = [];
  const load = createLoader({
    "node:os": { platform: () => state.platform },
    "node:fs": { existsSync: () => state.cached },
    "@raycast/utils": {},
    "./helpers/applescript": {
      getRaycastPaths: () => ({ supportPath: "/support" }),
      execBinary: async (binary, args) => {
        calls.push([binary, args]);
        if (binary === "/usr/bin/sw_vers") return { stdout: state.version };
        if (!state.tools) throw new Error("Developer tools unavailable");
        return { stdout: "/Library/Developer/CommandLineTools" };
      },
    },
    "./helpers/native-helper": {
      resolveNativeHelper: (name) => {
        if (state.damaged) throw new Error("Damaged bundle");
        return { binaryPath: `/support/${name}`, bundledBinaryPath: state.bundled ? `/assets/${name}` : undefined };
      },
      runNativeHelper: async () => {
        calls.push(["permission-check"]);
        return state.invalid ? "invalid" : JSON.stringify({ accessibility: state.access });
      },
    },
  });
  return { checkRuntimeEnvironment: load("src/runtime-environment.ts").checkRuntimeEnvironment, state, calls };
}

test("bundled and cached helpers run without developer tools, and permission checks never grant access", async () => {
  for (const options of [{ bundled: true }, { bundled: false, cached: true }]) {
    const check = environment(options);
    assert.deepEqual(await check.checkRuntimeEnvironment(), { kind: "ready" });
    assert.deepEqual(
      check.calls.map(([binary]) => binary),
      ["/usr/bin/sw_vers", "permission-check"],
    );
    check.state.access = false;
    assert.deepEqual(await check.checkRuntimeEnvironment(), { kind: "accessibility" });
  }
});

test("source installations identify missing tools before attempting native queries", async () => {
  const check = environment({ bundled: false });
  assert.deepEqual(await check.checkRuntimeEnvironment(), { kind: "developer-tools" });
  assert.equal(
    check.calls.some(([binary]) => binary === "permission-check"),
    false,
  );
  check.state.tools = true;
  assert.deepEqual(await check.checkRuntimeEnvironment(), { kind: "ready" });
  assert(check.calls.some(([binary]) => binary === "/usr/bin/xcrun"));
});

test("unsupported systems, damaged packages and malformed helper output have explicit setup states", async () => {
  for (const options of [{ platform: "linux" }, { version: "12.7" }]) {
    const check = environment(options);
    assert.deepEqual(await check.checkRuntimeEnvironment(), { kind: "unsupported" });
    assert.equal(
      check.calls.some(([binary]) => binary === "permission-check"),
      false,
    );
  }
  for (const options of [{ damaged: true }, { invalid: true }]) {
    assert.deepEqual(await environment(options).checkRuntimeEnvironment(), { kind: "error" });
  }
});

test("the setup view shows only the missing prerequisite and provides explicit recovery actions", async () => {
  let opened = "",
    checked = 0;
  const access = renderer({}, {}, "src/runtime-setup.tsx", "RuntimeSetupView", {
    status: { kind: "accessibility" },
    onCheck: () => checked++,
  });
  access.ui.open = async (url: string) => {
    opened = url;
  };
  const tree = access.render();
  assert.match(tree.props.markdown, /Enable Raycast/);
  assert.doesNotMatch(tree.props.markdown, /Command Line Tools/);
  await findAll(tree, (node) => node.props.title === "Open Accessibility Settings")[0].props.onAction();
  assert.match(opened, /Privacy_Accessibility$/);
  findAll(tree, (node) => node.props.title === "Check Again")[0].props.onAction();
  assert.equal(checked, 1);
  const tools = renderer({}, {}, "src/runtime-setup.tsx", "RuntimeSetupView", {
    status: { kind: "developer-tools" },
    onCheck() {},
  });
  assert.match(tools.render().props.markdown, /xcode-select --install/);
  assert.equal(
    findAll(tools.render(), (node) => node.props.title === "Copy Installation Command")[0].props.content,
    "xcode-select --install",
  );
  assert.equal(findAll(tools.render(), (node) => node.props.title === "Open Accessibility Settings").length, 0);
});

test("window discovery and actions stay disabled until setup is ready", () => {
  const setupTitles: Record<string, RegExp> = {
    accessibility: /Allow Accessibility Access/,
    "developer-tools": /Install Command Line Tools/,
    error: /Could Not Start/,
  };
  for (const kind of ["checking", "accessibility", "developer-tools", "error"]) {
    const enabled: boolean[] = [];
    const snapshot = {
      windows: [{ id: 1, pid: 42, app: "Cached App", title: "Cached Window", space: 1, "has-ax-reference": true }],
      metadataByPid: {},
      browserCounts: {},
      browserTabs: {},
      axWindowsByPid: {},
    };
    const view = renderer(snapshot, {
      "./runtime-environment": { useRuntimeEnvironment: () => ({ status: { kind }, revalidate() {} }) },
      "./use-window-search": {
        useWindowSearch: (value) => {
          enabled.push(value);
          return snapshot;
        },
      },
    });
    const tree = view.render();
    if (kind === "checking") {
      assert.equal(tree.type, view.ui.List);
      assert.equal(tree.props.isLoading, true);
      const rows = findAll(tree, (node) => node.type === view.ui.List.Item);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].props.actions, undefined);
      assert.equal(findAll(tree, (node) => node.type === view.ui.List.EmptyView).length, 0);
    } else {
      assert.match(tree.props.markdown, setupTitles[kind]);
    }
    assert.deepEqual(enabled, [false]);
  }
  let loads = 0;
  for (const enabled of [false, true]) {
    const data = { windows: [] };
    const effects: (() => void)[] = [];
    const load = createLoader({
      "@raycast/api": {},
      react: {
        useState: (value) => [typeof value === "function" ? value() : value, () => {}],
        useEffect: (fn) => effects.push(fn),
        useCallback: (fn) => fn,
      },
      "./window-data": {
        emptyWindowData: () => data,
        loadWindowData: async () => {
          loads++;
        },
      },
    });
    load("src/use-window-search.ts").useWindowSearch(enabled);
    effects.forEach((effect) => effect());
    assert.equal(loads, enabled ? 1 : 0);
  }
});

test("a new permission check does not reuse a previous ready state", () => {
  const result = { data: { kind: "ready" }, isLoading: true, revalidate() {} };
  const load = createLoader({ "@raycast/utils": { usePromise: () => result } });
  const { useRuntimeEnvironment } = load("src/runtime-environment.ts");
  assert.equal(useRuntimeEnvironment().status.kind, "checking");
  result.isLoading = false;
  result.data = { kind: "accessibility" };
  assert.equal(useRuntimeEnvironment().status.kind, "accessibility");
});
