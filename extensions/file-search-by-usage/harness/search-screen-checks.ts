import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import type { List } from "@raycast/api";

/** Observe committed text, including intermediate commits before layout effects. */
export async function searchScreenChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const commits: { text?: string; eventCount: number }[] = [];
  const queries: string[] = [];
  let input: (text: string, eventCount: number) => void;
  let setQuery: (text: string) => void;
  let refresh: () => void;
  let mounts = 0;
  let queryRenders = 0;
  let renderedQuery = "";
  function NativeList(props: List.Props) {
    // Raycast's input hook batches its event counter with the consumer callback.
    const [eventCount, setEventCount] = React.useState(0);
    input = (text, count) => {
      props.onSearchTextChange?.(text);
      setEventCount(count);
    };
    React.useLayoutEffect(() => {
      commits.push({ text: props.searchText, eventCount });
    }, [props.searchText, eventCount]);
    React.useEffect(() => {
      mounts++;
    }, []);
    return null;
  }
  const screenModule = {
    exports: {} as typeof import("../src/components/search-screen"),
  };
  const code = transformSync(
    fs.readFileSync("src/components/search-screen.tsx", "utf8"),
    { loader: "tsx", format: "cjs", jsxFactory: "React.createElement" },
  ).code;
  new Function("require", "module", "exports", "React", code)(
    (id: string) => (id === "react" ? React : { List: NativeList }),
    screenModule,
    screenModule.exports,
    React,
  );
  const { SearchScreen, SearchScreenView, SearchScreenContent } =
    screenModule.exports;
  let screen = new SearchScreen();
  function Results({ frameId = 0 }: { frameId?: number }) {
    const query = React.useSyncExternalStore(
      screen.subscribe,
      screen.getSearchText,
    );
    const [revision, setRevision] = React.useState(0);
    queryRenders++;
    renderedQuery = query;
    setQuery = (text) => screen.setSearchText(frameId, text);
    refresh = () => setRevision((value) => value + 1);
    return React.createElement(SearchScreenContent, {
      screen,
      frameId,
      searchText: query,
      isLoading: revision % 2 === 0,
      onSearchTextChange: (text: string) => {
        queries.push(text);
      },
    });
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SearchScreenView, { screen }),
          React.createElement(Results),
        ),
      );
    });
    for (const [index, text] of ["f", "fo", "foo", "fo", "foo", ""].entries()) {
      commits.length = 0;
      await act(() => input(text, index + 1));
      assert(
        commits.length > 0 && commits.every((commit) => commit.text === text),
        `typing ${JSON.stringify(text)} never commits stale text with a new input event`,
      );
    }
    commits.length = 0;
    await act(() => {
      input("b", 7);
      input("ba", 8);
      input("bar", 9);
      refresh();
    });
    assert(
      commits.length > 0 && commits.every((commit) => commit.text === "bar"),
      "batched typing and incoming results keep the latest query in every commit",
    );
    assert(
      queries.join("|") === "f|fo|foo|fo|foo||b|ba|bar",
      "each input reaches the search owner once, without an echo",
    );
    await act(() => setQuery("baz"));
    assert(
      commits.at(-1)?.text === "baz" && queries.length === 9,
      "programmatic history changes update the field without inventing input events",
    );
    commits.length = 0;
    await act(() => refresh());
    assert(
      commits.length === 0 && mounts === 1,
      "result refreshes neither rewrite the input nor remount the native List",
    );
    const pendingResults = screen.getSnapshot();
    await act(() => input("foobar", 10));
    commits.length = 0;
    const rendersBefore = queryRenders;
    await act(() => screen.publish(0, { ...pendingResults, isLoading: false }));
    assert(
      screen.getSnapshot().searchText === "foobar" &&
        commits.every((commit) => commit.text === "foobar"),
      "results prepared before a keystroke cannot overwrite newer input",
    );
    assert(
      queryRenders === rendersBefore && renderedQuery === "foobar",
      "result-only publications do not rerender the query consumer",
    );
    commits.length = 0;
    await act(() => {
      for (const [index, text] of [
        "g",
        "gr",
        "gra",
        "gran",
        "grant",
        "grants",
        "grant",
        "grants",
      ].entries()) {
        input(text, index + 11);
        screen.publish(0, pendingResults);
      }
      refresh();
    });
    assert(
      screen.getSearchText() === "grants" &&
        renderedQuery === "grants" &&
        commits.every((commit) => commit.text === "grants"),
      "rapid typing and backspace survive repeated stale result publications",
    );
    await act(() => renderer!.unmount());
    const previousScreen = screen;
    screen = new SearchScreen(1);
    await act(() => screen.onSearchTextChange("bar"));
    await act(() => screen.publish(1, { searchText: "", isLoading: false }));
    assert(
      screen.getSnapshot().searchText === "bar",
      "typing before a new folder's results mount survives their first publication",
    );
    await act(
      () =>
        (renderer = create(
          React.createElement(
            React.Fragment,
            null,
            React.createElement(SearchScreenView, { screen }),
            React.createElement(Results, { key: 1, frameId: 1 }),
          ),
        )),
    );
    assert(
      renderedQuery === "bar" && mounts === 2,
      "a new route starts with text typed before its results mount",
    );
    await act(() => screen.setSearchText(0, "obsolete"));
    assert(
      screen.getSearchText() === "bar",
      "programmatic edits from a previous folder cannot reset the active query",
    );
    previousScreen.onSearchTextChange("obsolete");
    assert(
      screen.getSearchText() === "bar",
      "a discarded route cannot change the new route's query",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
