import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { FolderNavigation, FolderResume } from "../src/lib/folder-navigation";
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
      .slice(source.indexOf("export function Browser(props:"))
      .replace("export function", "function"),
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  let mountedViews = 0;
  let peakViews = 0;
  let unmountedViews = 0;
  let nativePushes = 0;
  let nativeListMounts = 0;
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
  new Function("require", "module", "exports", "React", screenCode)(
    (id: string) => (id === "react" ? React : { List }),
    screenModule,
    screenModule.exports,
    React,
  );
  type ViewProps = {
    dir?: string;
    frameId: number;
    initialSearchText: string;
    initialSelectionPath?: string;
    navigation: FolderNavigation;
    setup: SearchSetup;
    screen: SearchScreen;
    onNavigate: (
      id: number,
      dir: string,
      selected: string | undefined,
      resume: FolderResume,
    ) => void;
    onBack: (id: number) => void;
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
      searchText: props.initialSearchText,
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
    enableNavigationDiagnostics: () => {},
    traceNavigation: () => {},
    traceNavigationAfterRelease: () => {},
    useSearchSetup: setupModule.exports.useSearchSetup,
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
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  const go = async (
    dir: string,
    query = "",
    selectedPath?: string,
    initialSelection?: string,
  ) => {
    await act(() =>
      current.onNavigate(current.frameId, dir, initialSelection, {
        query,
        selectedPath,
      }),
    );
  };
  const back = async () => {
    await act(() => current.onBack(current.frameId));
  };
  try {
    await act(async () => {
      renderer = create(React.createElement(Screen));
    });
    await go("/foo", "foo", "/foo");
    assert(
      renderer!.root.findByType("list").props.searchText === "",
      "folder navigation clears the search text on the persistent native List",
    );
    await go("/foo/bar", "bar", "/foo/bar");
    const stale = { frameId: current!.frameId, navigate: current!.onNavigate };
    await go("/foo", "", undefined, "/foo/bar");
    assert(
      current!.dir === "/foo" &&
        current!.initialSearchText === "bar" &&
        current!.initialSelectionPath === "/foo/bar",
      "the single screen restores parent query and folder selection",
    );
    await act(() =>
      stale.navigate(stale.frameId, "/foo/baz", undefined, { query: "" }),
    );
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
      await go("/foo/bar", "bar", "/foo/bar");
      await go("/foo", "", undefined, "/foo/bar");
    }
    assert(
      nativePushes === 0 &&
        nativeListMounts === 1 &&
        peakViews === 1 &&
        mountedViews === 1 &&
        unmountedViews === before + 120,
      "120 folder transitions push no native screens and release each previous result view",
    );
    assert(
      setupRuns === 1 && !setupSignal?.aborted && current!.setup.importing,
      "setup remains active without retaining any previous folder view",
    );
    for (let i = 0; i < 6; i++) await go(`/foo/bar${i}`);
    assert(
      setupRuns === 1 && !setupSignal?.aborted,
      "discarding old folder history does not cancel command-owned setup",
    );
    await act(async () => {
      finishSetup();
      await setupPromise;
    });
    assert(
      !current!.setup.importing,
      "setup completion reaches the active folder after history eviction",
    );
    while (current!.navigation.canGoBack) await back();
    assert(
      renderer!.root.findByType("list").props.searchText === "foo" &&
        nativeListMounts === 1,
      "Back restores the query without remounting the native List",
    );
    const beforeStalePublish = current!.screen.getSnapshot();
    current!.screen.publish(stale.frameId, { searchText: "obsolete" });
    assert(
      current!.screen.getSnapshot() === beforeStalePublish,
      "late result publication from an old folder cannot replace the active List",
    );
    assert(
      current!.dir === undefined &&
        current!.initialSearchText === "foo" &&
        current!.initialSelectionPath === "/foo",
      "Back beyond retained folders restores the saved starting search",
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
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
