import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { FolderNavigation } from "../src/lib/folder-navigation";
import type { SearchScreen } from "../src/components/search-screen";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { locate } from "./source-slice";

/** Exercise the real shell and setup hook with observable result-view lifetimes. */
export async function navigationMemoryChecks(
  assert: (ok: boolean, label: string) => void,
  stress = false,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const code = transformSync(
    source
      .slice(locate(source, "function BrowserFrame("))
      .replace("export function", "function"),
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  let mountedViews = 0;
  let peakViews = 0;
  let unmountedViews = 0;
  let nativePushes = 0;
  let nativeListMounts = 0;
  let nativePops = 0;
  let peakRoutes = 1;
  let liveRoutes = 1;
  let viewRenders = 0;
  type Route = { id: number; node: React.ReactNode; onPop?: () => void };
  const Navigation = React.createContext({
    push: (_node: React.ReactNode, _onPop?: () => void) => {},
    pop: () => {},
  });
  let nativePop: () => void;
  function NativeHost({ children }: { children: React.ReactNode }) {
    const [routes, setRoutes] = React.useState<Route[]>([]);
    const api = React.useMemo(
      () => ({
        push: (node: React.ReactNode, onPop?: () => void) => {
          const id = ++nativePushes;
          setRoutes((previous) => [...previous, { id, node, onPop }]);
        },
        pop: () => {
          nativePops++;
          setRoutes((previous) => {
            // The SDK retains its last route; exiting the command belongs to
            // Raycast's native host and cannot be proved by this React stub.
            if (previous.length === 0) return previous;
            previous.at(-1)?.onPop?.();
            return previous.slice(0, -1);
          });
        },
      }),
      [],
    );
    nativePop = api.pop;
    liveRoutes = routes.length + 1;
    peakRoutes = Math.max(peakRoutes, liveRoutes);
    return React.createElement(
      Navigation.Provider,
      { value: api },
      children,
      ...routes.map(({ id, node }) =>
        React.createElement(React.Fragment, { key: id }, node),
      ),
    );
  }
  const screenModule = {
    exports: {} as typeof import("../src/components/search-screen"),
  };
  const screenCode = transformSync(
    fs.readFileSync("src/components/search-screen.tsx", "utf8"),
    {
      loader: "tsx",
      format: "cjs",
      jsxFactory: "React.createElement",
    },
  ).code;
  const List = (props: Record<string, unknown>) => {
    React.useEffect(() => {
      nativeListMounts++;
    }, []);
    return React.createElement("list", props);
  };
  const fakeList = Object.assign(List, { EmptyView: "empty-view" });
  let nativeClears = 0;
  const nativeApi = {
    clearSearchBar: async () => {
      nativeClears++;
    },
    List: fakeList,
    Action: "action",
    ActionPanel: "actions",
    Icon: { MagnifyingGlass: "search" },
    useNavigation: () => React.useContext(Navigation),
  };
  const navigationModule = {
    exports: {} as typeof import("../src/components/native-search-navigation"),
  };
  const navigationCode = transformSync(
    fs.readFileSync("src/components/native-search-navigation.tsx", "utf8"),
    { loader: "tsx", format: "cjs", jsxFactory: "React.createElement" },
  ).code;
  const eventModule = {
    exports: {} as typeof import("../src/components/use-event-handles"),
  };
  const eventCode = transformSync(
    fs.readFileSync("src/components/use-event-handles.ts", "utf8"),
    { loader: "ts", format: "cjs" },
  ).code;
  new Function("require", "module", "exports", eventCode)(
    () => React,
    eventModule,
    eventModule.exports,
  );
  new Function("require", "module", "exports", "React", navigationCode)(
    (id: string) =>
      id === "react"
        ? React
        : id === "@raycast/api"
          ? nativeApi
          : id.endsWith("navigation-diagnostics")
            ? { traceNavigation: () => {} }
            : eventModule.exports,
    navigationModule,
    navigationModule.exports,
    React,
  );
  new Function("require", "module", "exports", "React", screenCode)(
    (id: string) => (id === "react" ? React : { List }),
    screenModule,
    screenModule.exports,
    React,
  );
  type ViewProps = {
    dir?: string;
    frameId: number;
    initialSelectionPath?: string;
    includeHidden?: boolean;
    onToggleHidden?: () => void;
    navigation: FolderNavigation;
    screen: SearchScreen;
    onNavigate: (id: number, dir: string, selected: string | undefined) => void;
    onReturnToStart: (id: number) => void;
  };
  let current: ViewProps;
  function View(props: ViewProps) {
    React.useState(() =>
      stress
        ? Array.from({ length: 100_000 }, (_, index) => ({
            path: `/foo/bar/${index}`,
            index,
          }))
        : [],
    );
    current = props;
    viewRenders++;
    React.useEffect(() => {
      mountedViews++;
      peakViews = Math.max(peakViews, mountedViews);
      return () => {
        mountedViews--;
        unmountedViews++;
      };
    }, []);
    return React.createElement(screenModule.exports.SearchScreenContent, {
      screen: props.screen,
      frameId: props.frameId,
    });
  }

  let preferenceHidden = false;
  const deps = {
    React,
    useState: React.useState,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useCallback: React.useCallback,
    useEffect: React.useEffect,
    useSyncExternalStore: React.useSyncExternalStore,
    BrowserView: View,
    List: "list",
    FolderNavigation,
    normalizeDir: (dir: string) => dir,
    environment: { isDevelopment: false },
    getPreferenceValues: () => ({ showHidden: preferenceHidden }),
    enableNavigationDiagnostics: () => {},
    traceNavigation: () => {},
    traceNavigationAfterRelease: () => {},
    NativeSearchNavigation: navigationModule.exports.NativeSearchNavigation,
    SearchScreen: screenModule.exports.SearchScreen,
    SearchScreenView: screenModule.exports.SearchScreenView,
    useNavigation: () => ({
      push: () => {
        nativePushes++;
      },
      pop: () => {},
    }),
  };
  const Screen = new Function(...Object.keys(deps), code + "\nreturn Browser;")(
    ...Object.values(deps),
  ) as React.FunctionComponent;
  const command = () =>
    React.createElement(NativeHost, null, React.createElement(Screen));
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  const go = async (dir: string, initialSelection?: string) => {
    await act(async () =>
      current.onNavigate(current.frameId, dir, initialSelection),
    );
  };
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  /**
   * Run the queue out instead of sleeping.
   *
   * Nothing this file drives runs on a timer. The debounce lives in
   * `BrowserView`, which is stubbed out here, so the only deferral left in the
   * code under test is the `queueMicrotask` that releases a popped route. Each
   * wait below is a claim that some work has finished and nothing further
   * happens, and a fixed delay proves neither: it waits on a timer that does
   * not exist and it passes even if work is still queued. A fixed number of
   * turns is no better, because "pushed" and "released" can be several turns
   * apart. So wait on the condition instead: flush until the observable
   * command state has held still, with a generous bound, and fail loudly if it
   * never does.
   */
  const observed = () =>
    [
      nativePushes,
      nativePops,
      nativeListMounts,
      nativeClears,
      liveRoutes,
      peakRoutes,
      mountedViews,
      peakViews,
      unmountedViews,
      viewRenders,
      current.frameId,
      String(current.dir),
      current.screen.getSearchText(),
      Object.keys(current.screen.getSnapshot()).length,
    ].join("|");
  const settle = async (label: string) => {
    let state = observed();
    let held = 0;
    for (let turn = 0; turn < 2000; turn++) {
      await act(async () => {
        await flush();
      });
      const next = observed();
      if (next !== state) {
        state = next;
        held = 0;
      } else if (++held === 5) return;
    }
    throw new Error(`timed out waiting for ${label}`);
  };
  try {
    await act(async () => {
      renderer = create(command());
    });
    assert(
      nativePushes === 0 &&
        liveRoutes === 1 &&
        mountedViews === 1 &&
        current!.dir === undefined &&
        current!.screen.getSearchText() === "",
      "startup renders default results at the native root, without an extra blank screen",
    );
    assert(
      current!.includeHidden === false,
      "hidden-file visibility starts from the saved preference",
    );
    await act(() => current.onToggleHidden?.());
    assert(
      current!.includeHidden === true,
      "the hidden-file toggle changes the current command state",
    );
    await act(() => current.screen.setSearchText(current.frameId, "foo"));
    await settle("the root view to settle after a query-history change");
    assert(
      current!.screen.getSearchText() === "foo" &&
        liveRoutes === 1 &&
        mountedViews === 1,
      "query-history changes reuse the root search view without restarting its work",
    );
    const previousScreen = current!.screen;
    // An empty snapshot only means "released" if something was published.
    const publishedBeforeLeaving = Object.keys(
      previousScreen.getSnapshot(),
    ).length;
    await go("/foo");
    const suspendedRoot = renderer!.root.findAllByType("list")[0].props;
    assert(
      suspendedRoot.searchText === "" &&
        suspendedRoot.children === undefined &&
        suspendedRoot.onSearchTextChange === undefined,
      "the retained root input is blank and inactive with no result payload while a folder is open",
    );
    assert(
      current!.screen.getSearchText() === "" && liveRoutes === 2,
      "folder navigation starts a blank query in one active native search route",
    );
    assert(
      publishedBeforeLeaving > 0 &&
        Object.keys(previousScreen.getSnapshot()).length === 0,
      "popping a folder releases its published rows and callback payload immediately",
    );
    const mountsBeforeTyping = nativeListMounts;
    await act(() => current.screen.setSearchText(current.frameId, "bar"));
    assert(
      nativeListMounts === mountsBeforeTyping,
      "typing preserves the active native input instance",
    );
    await go("/foo/bar");
    const stale = { frameId: current!.frameId, navigate: current!.onNavigate };
    await go("/foo", "/foo/bar");
    assert(
      current!.dir === "/foo" &&
        current!.screen.getSearchText() === "" &&
        current!.initialSelectionPath === "/foo/bar",
      "the single screen starts a fresh parent query and selects the folder just left",
    );
    await act(() => stale.navigate(stale.frameId, "/foo/baz", undefined));
    assert(
      current!.dir === "/foo",
      "a deleted result view cannot navigate through a late callback",
    );

    const before = unmountedViews;
    const pushesBeforeMoves = nativePushes;
    const popsBeforeMoves = nativePops;
    const inputsBeforeMoves = nativeListMounts;
    global.gc?.();
    const heapBefore = process.memoryUsage().heapUsed;
    for (let count = 0; count < 60; count++) {
      await go("/foo/bar");
      // Type inside the folder, so each transition carries a query with it.
      await act(() =>
        current.screen.setSearchText(current.frameId, `q${count}`),
      );
      await go("/foo", "/foo/bar");
    }
    global.gc?.();
    const heapGrowth = process.memoryUsage().heapUsed - heapBefore;
    assert(
      heapGrowth < 48 * 1024 * 1024,
      `120 folder transitions with a query each do not grow the heap without bound (${Math.round(heapGrowth / 1048576)}MB)`,
    );
    assert(
      current!.includeHidden === true,
      "hidden-file visibility survives repeated folder navigation",
    );
    assert(
      nativePushes === nativePops + 1 &&
        nativePushes === pushesBeforeMoves &&
        nativePops === popsBeforeMoves &&
        nativeListMounts === inputsBeforeMoves &&
        liveRoutes === 2 &&
        peakRoutes === 2 &&
        peakViews === 1 &&
        mountedViews === 1 &&
        unmountedViews === before + 120,
      "120 transitions reuse the folder route and input while releasing each old result view",
    );
    for (let i = 0; i < 6; i++) await go(`/foo/bar${i}`);
    const oldFrame = current!.frameId;
    const oldReset = current!.onReturnToStart;
    await act(async () => current.onReturnToStart(current.frameId));
    assert(
      current!.dir === undefined &&
        current!.screen.getSearchText() === "" &&
        current!.initialSelectionPath === undefined,
      "Return to Start clears the folder, query and old selection",
    );
    assert(
      liveRoutes === 1 &&
        peakRoutes === 2 &&
        mountedViews === 1 &&
        peakViews === 1 &&
        current!.includeHidden === true,
      "Return to Start leaves only default root results and preserves session settings",
    );
    const startFrame = current!.frameId;
    await act(() => oldReset(oldFrame));
    assert(
      current!.frameId === startFrame,
      "an obsolete reset callback cannot replace the new start screen",
    );
    const rootInput =
      renderer!.root.findByType("list").props.onSearchTextChange;
    await act(() => rootInput("unfinished"));
    await go("/", "/foo");
    await act(() => rootInput("late input"));
    await settle("input from the discarded root to be handled or dropped");
    assert(
      current!.screen.getSearchText() === "" &&
        liveRoutes === 2 &&
        current!.initialSelectionPath === "/foo",
      "folder navigation cancels root typing and ignores input from the discarded root",
    );
    const beforeStalePublish = current!.screen.getSnapshot();
    current!.screen.publish(stale.frameId, { searchText: "obsolete" });
    assert(
      current!.screen.getSnapshot() === beforeStalePublish,
      "late result publication from an old folder cannot replace the active List",
    );
    const publishedBeforeClosing = Object.keys(
      current!.screen.getSnapshot(),
    ).length;
    await act(() => renderer!.unmount());
    renderer = undefined;
    assert(
      mountedViews === 0,
      "closing the command releases the final result view",
    );
    assert(
      publishedBeforeClosing > 0 &&
        Object.keys(current!.screen.getSnapshot()).length === 0,
      "closing the result view releases its published rows and callbacks",
    );
    await act(() => {
      renderer = create(command());
    });
    assert(
      current!.includeHidden === false,
      "reopening the command discards the hidden-file override",
    );
    await act(() => renderer!.unmount());
    preferenceHidden = true;
    await act(() => {
      renderer = create(command());
    });
    await act(() => current.onToggleHidden?.());
    assert(
      current!.includeHidden === false,
      "the toggle can hide files when the saved preference shows them",
    );
    await act(() => {
      current.onToggleHidden?.();
      current.onToggleHidden?.();
    });
    assert(
      current!.includeHidden === false,
      "two rapid hidden-file toggles preserve the starting visibility",
    );
    await go("/foo/bar");
    const old = current!;
    const publishedBeforeBack = Object.keys(old.screen.getSnapshot()).length;
    const mountsBeforeBack = nativeListMounts;
    const pushesBeforeRootBack = nativePushes;
    await act(async () => nativePop());
    assert(
      nativeListMounts === mountsBeforeBack,
      "native Back reuses the root input and its event counter instead of remounting it",
    );
    assert(
      liveRoutes === 1 &&
        mountedViews === 1 &&
        current!.dir === undefined &&
        current!.screen.getSearchText() === "" &&
        current!.frameId !== old.frameId &&
        publishedBeforeBack > 0 &&
        Object.keys(old.screen.getSnapshot()).length === 0,
      "Escape releases folder results and renders fresh default results at the root",
    );
    await act(() => old.onNavigate(old.frameId, "/obsolete", undefined));
    assert(
      liveRoutes === 1 && mountedViews === 1 && current!.dir === undefined,
      "late folder actions cannot reopen a route after Escape",
    );
    const root = renderer!.root.findByType("list");
    const inputMounts = nativeListMounts;
    const queryScreen = current!.screen;
    const clearsBeforeTyping = nativeClears;
    for (const text of ["l", "le", "ledger"]) {
      await act(() => root.props.onSearchTextChange(text));
    }
    await settle("rapid root typing to reach the result producer");
    assert(
      nativeClears === clearsBeforeTyping,
      "typing global queries never clears the native search bar",
    );
    assert(
      current!.screen.getSearchText() === "ledger" &&
        liveRoutes === 1 &&
        mountedViews === 1 &&
        nativeListMounts === inputMounts &&
        current!.screen === queryScreen,
      "rapid root typing keeps the same input and result producer after the old 250ms boundary",
    );
    await act(async () => current.screen.onSearchTextChange(""));
    assert(
      liveRoutes === 1 &&
        current!.screen.getSearchText() === "" &&
        current!.dir === undefined,
      "clearing an Everywhere query returns to the root without a duplicate default screen",
    );
    const clearedRoot = renderer!.root.findAllByType("list").at(-1)!;
    await act(() => clearedRoot.props.onSearchTextChange("ledger"));
    await settle("a name search on the restored root to reach the producer");
    // Native Escape's clear-search behavior calls the input handler first.
    await act(async () => current.screen.onSearchTextChange(""));
    assert(
      liveRoutes === 1 &&
        mountedViews === 1 &&
        current!.screen.getSearchText() === "",
      "Escape from a name search restores the default root with an empty query",
    );
    await act(async () => nativePop());
    await settle("a Back request at the SDK root to be handled");
    assert(
      mountedViews === 1 &&
        liveRoutes === 1 &&
        nativePushes === pushesBeforeRootBack &&
        current!.screen.getSearchText() === "",
      "a Back request at the SDK root never pushes a replacement route; native exit needs a live test",
    );
    await act(() => renderer!.unmount());
    const pushesBeforeStrict = nativePushes;
    await act(() => {
      renderer = create(React.createElement(React.StrictMode, null, command()));
    });
    assert(
      nativePushes === pushesBeforeStrict &&
        liveRoutes === 1 &&
        peakRoutes === 2 &&
        mountedViews === 1,
      "React effect replay does not push duplicate routes or lose the active view",
    );
    const strictRoot = renderer!.root.findByType("list");
    await act(() => strictRoot.props.onSearchTextChange("ledger"));
    await settle("effect replay to finish with the initial query");
    assert(
      current!.screen.getSearchText() === "ledger",
      "effect replay preserves the initial query when starting a native route",
    );
    await act(async () => current.screen.onSearchTextChange(""));
    const returnRoot = renderer!.root.findByType("list");
    await act(() => returnRoot.props.onSearchTextChange("library"));
    await act(() => returnRoot.props.onSearchTextChange(""));
    const pushesBeforeClear = nativePushes;
    await settle("the cleared root query to reach its final state");
    assert(
      current!.screen.getSearchText() === "" &&
        nativePushes === pushesBeforeClear &&
        liveRoutes === 1,
      "clearing the root query cancels the pending search instead of reopening it",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
