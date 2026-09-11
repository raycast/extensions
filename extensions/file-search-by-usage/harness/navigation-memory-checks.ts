import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { FolderNavigation } from "../src/lib/folder-navigation";
import type { SearchSetup } from "../src/components/use-search-setup";
import type { SearchScreen } from "../src/components/search-screen";
import { act, create, ReactTestRenderer } from "react-test-renderer";

/** Exercise the real shell and setup hook with observable result-view lifetimes. */
export async function navigationMemoryChecks(
  assert: (ok: boolean, label: string) => void,
  stress = false,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const code = transformSync(
    source
      .slice(source.indexOf("function BrowserFrame("))
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
  const nativeApi = {
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
    setup: SearchSetup;
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

  let finishSetup: () => void = () => {};
  let setupSignal: AbortSignal | undefined;
  let setupRuns = 0;
  const setupCode = transformSync(
    fs.readFileSync("src/components/use-search-setup.ts", "utf8"),
    { loader: "ts", format: "cjs" },
  ).code;
  const setupModule = {
    exports: {} as {
      useSearchSetup: (reload: number, done: () => void) => SearchSetup;
    },
  };
  const setupDeps: Record<string, unknown> = {
    react: React,
    "@raycast/api": {
      Toast: { Style: { Failure: "failure" } },
      showToast: async () => {},
    },
    "../lib/recent-setup": { loadRecentEntries: () => [] },
    "../lib/storage-lock": { dataGeneration: () => 0 },
    "../lib/search-setup": {
      loadSearchSetup: async () => ({
        recents: true,
        drive: true,
        hasRun: false,
      }),
      confirmSearchSetup: async () => true,
      skipSearchSetup: async () => true,
      runSearchSetup: async (options: {
        signal: AbortSignal;
        onStage: (stage: string) => void;
      }) => {
        setupRuns++;
        setupSignal = options.signal;
        options.onStage("drive");
        await new Promise<void>((resolve) => {
          finishSetup = resolve;
          options.signal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
      },
    },
  };
  new Function("require", "module", "exports", setupCode)(
    (id: string) => {
      if (!(id in setupDeps)) throw new Error(`Unexpected setup import: ${id}`);
      return setupDeps[id];
    },
    setupModule,
    setupModule.exports,
  );
  let preferenceHidden = false;
  const deps = {
    React,
    useState: React.useState,
    useRef: React.useRef,
    useCallback: React.useCallback,
    useEffect: React.useEffect,
    BrowserView: View,
    List: "list",
    FolderNavigation,
    normalizeDir: (dir: string) => dir,
    environment: { isDevelopment: false },
    getPreferenceValues: () => ({ showHidden: preferenceHidden }),
    enableNavigationDiagnostics: () => {},
    traceNavigation: () => {},
    traceNavigationAfterRelease: () => {},
    useSearchSetup: setupModule.exports.useSearchSetup,
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
    await act(() => current.onNavigate(current.frameId, dir, initialSelection));
  };
  try {
    await act(async () => {
      renderer = create(command());
    });
    assert(
      nativePushes === 1,
      "search starts in its own native route, separate from the lightweight root",
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
    const previousScreen = current!.screen;
    await go("/foo");
    assert(
      current!.screen.getSearchText() === "" && liveRoutes === 2,
      "folder navigation starts a blank query in one active native search route",
    );
    assert(
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

    let setupPromise: Promise<void> | undefined;
    await act(async () => {
      setupPromise = current.setup.start();
      await Promise.resolve();
    });
    assert(
      current!.setup.importing && setupRuns === 1,
      "setup starts in a folder under the command owner",
    );
    const before = unmountedViews;
    for (let count = 0; count < 60; count++) {
      await go("/foo/bar");
      await go("/foo", "/foo/bar");
    }
    assert(
      current!.includeHidden === true,
      "hidden-file visibility survives repeated folder navigation",
    );
    assert(
      nativePushes === nativePops + 1 &&
        liveRoutes === 2 &&
        peakRoutes === 2 &&
        peakViews === 1 &&
        mountedViews === 1 &&
        unmountedViews === before + 120,
      "120 transitions replace the native route and release old results without growing the stack",
    );
    assert(
      setupRuns === 1 && !setupSignal?.aborted && current!.setup.importing,
      "setup remains active without retaining any previous folder view",
    );
    for (let i = 0; i < 6; i++) await go(`/foo/bar${i}`);
    const oldFrame = current!.frameId;
    const oldReset = current!.onReturnToStart;
    await act(() => current.onReturnToStart(current.frameId));
    assert(
      current!.dir === undefined &&
        current!.screen.getSearchText() === "" &&
        current!.initialSelectionPath === undefined,
      "Return to Start clears the folder, query and old selection",
    );
    assert(
      liveRoutes === 2 &&
        peakRoutes === 2 &&
        mountedViews === 1 &&
        peakViews === 1 &&
        current!.includeHidden === true,
      "Return to Start keeps only the root and active route and preserves session settings",
    );
    const startFrame = current!.frameId;
    await act(() => oldReset(oldFrame));
    assert(
      current!.frameId === startFrame,
      "an obsolete reset callback cannot replace the new start screen",
    );
    assert(
      setupRuns === 1 && !setupSignal?.aborted,
      "visiting further folders does not cancel command-owned setup",
    );
    await act(async () => {
      finishSetup();
      await setupPromise;
    });
    assert(
      !current!.setup.importing,
      "setup completion reaches the active folder after repeated navigation",
    );
    await go("/", "/foo");
    assert(
      current!.screen.getSearchText() === "" &&
        liveRoutes === 2 &&
        current!.initialSelectionPath === "/foo",
      "parent navigation reaches the filesystem root through a fresh native route",
    );
    const beforeStalePublish = current!.screen.getSnapshot();
    current!.screen.publish(stale.frameId, { searchText: "obsolete" });
    assert(
      current!.screen.getSnapshot() === beforeStalePublish,
      "late result publication from an old folder cannot replace the active List",
    );
    await act(async () => {
      setupPromise = current.setup.start();
      await Promise.resolve();
    });
    await act(() => renderer!.unmount());
    await act(async () => {
      await setupPromise;
    });
    renderer = undefined;
    assert(
      setupSignal?.aborted === true && mountedViews === 0,
      "closing the command cancels setup and releases the final result view",
    );
    assert(
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
    const old = current!;
    await act(() => nativePop());
    assert(
      liveRoutes === 1 && mountedViews === 0,
      "Escape releases the active results and leaves only the empty start screen",
    );
    await act(() => old.onNavigate(old.frameId, "/obsolete", undefined));
    assert(
      liveRoutes === 1 && mountedViews === 0,
      "late folder actions cannot reopen a route after Escape",
    );
    const root = renderer!.root.findByType("list");
    for (const text of ["g", "gr", "grants"]) {
      await act(() => root.props.onSearchTextChange(text));
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    assert(
      current!.screen.getSearchText() === "grants" &&
        liveRoutes === 2 &&
        mountedViews === 1,
      "rapid typing on the start screen opens a native route with the complete query",
    );
    await act(() => renderer!.unmount());
    const pushesBeforeStrict = nativePushes;
    await act(() => {
      renderer = create(React.createElement(React.StrictMode, null, command()));
    });
    assert(
      nativePushes === pushesBeforeStrict + 1 &&
        liveRoutes === 2 &&
        peakRoutes === 2 &&
        mountedViews === 1,
      "React effect replay does not push duplicate routes or lose the active view",
    );
    await act(() => nativePop());
    const strictRoot = renderer!.root.findByType("list");
    await act(() => strictRoot.props.onSearchTextChange("grants"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    assert(
      current!.screen.getSearchText() === "grants",
      "effect replay preserves the initial query when starting a native route",
    );
    await act(() => nativePop());
    const returnRoot = renderer!.root.findByType("list");
    await act(() => returnRoot.props.onSearchTextChange("library"));
    await act(() => returnRoot.props.actions.props.children.props.onAction());
    assert(
      current!.screen.getSearchText() === "library",
      "pressing Return during the root typing delay searches the entered query",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
