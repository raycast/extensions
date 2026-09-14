import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { useFolderSelection } from "../src/components/use-folder-selection";
import { rowIdForEntry } from "../src/lib/entry-identity";
import { LIVE_RENDERED_RESULTS } from "../src/lib/search-limits";
import { displayRows } from "../src/lib/display-rows";
import * as format from "../src/lib/format";
import {
  deriveProgress,
  describeProgress,
  rowsCanChange,
} from "../src/lib/progress";
import { chooseListView } from "../src/lib/list-view";
import { between, locate } from "./source-slice";

/** Exercise the browser's bounded display and native selection boundary. */
export async function listRenderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const sectionStart = source.lastIndexOf("<List.Section");
  const headingCode = transformSync(
    between(
      source,
      "  const scopeLabel =",
      "  /**\n   * Whether rows render, and equally whether a selection",
    ) +
      "\nreturn (" +
      source.slice(sectionStart, locate(source, ">", sectionStart) + 1) +
      "</List.Section>);",
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  function heading(dir: string, caveat?: string) {
    const deps = {
      React,
      List: { Section: "section" },
      ...format,
      dir,
      displayPath: (value: string) => value,
      query: "",
      pathQuery: undefined,
      minQuery: 3,
      settling: false,
      rows: Array(6),
      light: "🟢",
      describeProgress,
      LIVE_RENDERED_RESULTS,
      caveat,
      recentFiles: { partial: false },
      cachedPartial: false,
      orderingLabel: "most-used first",
    };
    return new Function(...Object.keys(deps), headingCode)(
      ...Object.values(deps),
    ).props;
  }
  const shortHeading = heading("/foo/bar/baz");
  assert(
    shortHeading.title.includes("…/bar/baz") &&
      !shortHeading.title.includes("/foo/") &&
      shortHeading.subtitle === undefined &&
      shortHeading.title.includes("complete"),
    "the section uses one text field with a compact path, count, and status",
  );
  const longHeading = heading(`/foo/bar/${"baz".repeat(100)}\nqux`);
  assert(
    longHeading.title.length < 90 &&
      !/[\r\n\t\u2028\u2029]/u.test(longHeading.title),
    "long folder names and embedded line breaks cannot expand the section label",
  );
  assert(
    heading("/foo/bar", "Some files could not be checked").title.includes(
      "Some files could not be checked",
    ),
    "shortening the header preserves search caveats",
  );
  const rowsGate = between(
    source,
    "  /**\n   * Whether rows render, and equally whether a selection",
    "\n  const rowHandlers",
  );
  const reset = between(
    source,
    "  // Reset row IDs for a new query;",
    "  const onSearchTextChange",
  );
  const code = transformSync(
    `return function View({ rows: candidates, rankingReady = true, searchActive = true, searching = false, settling = false, computing = false, directoryPending = false, initialSelectionPath, query = "", restorationRevision = 0 }) {
    const [generation, setGeneration] = useState(0);
    const parsed = { normalized: query }, dir = undefined, queryKey = query;
    ${between(source, "  const selectionReader =", "  const { rows, rowLimitReached } =")}
    const rows = displayRows(candidates, preservedPath);
    const cachedPending = false, recentFiles = { pending: false };
    // Built by the real deriveProgress and read by the real rowsCanChange, so
    // the predicate gating both the rows and the selection is the shipped one.
    // \`computing\` stands in for a still-running background read, which is what
    // a first visit to a folder actually has running.
    const progress = deriveProgress({ rankingReady, backgroundPending: computing,
      scoped: false, directChildrenOnly: false, folderMetaPending: directoryPending,
      isPathQuery: false, query, isHiddenOnly: false, searching,
      termLength: query.length, minQuery: 3, rankingPending: false });
    ${reset}
    ${rowsGate}
    // visibleRows, not renderedRows: what the component renders, not what it
    // holds. Asserting on the wrong one is why the held-rows gate was untested.
    return <List entries={visibleRows}
      selectedId={selectedId} onSelectionChange={onSelectionChange} />;
  }`,
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  const commits: { paths: string[]; selectedId: string | null }[] = [];
  function ObservedList(props: {
    entries: { entry: { path: string } }[];
    selectedId: string | null;
  }) {
    React.useLayoutEffect(() => {
      commits.push({
        paths: props.entries.map(({ entry }) => entry.path),
        selectedId: props.selectedId,
      });
    });
    return React.createElement("list", props);
  }
  const View = new Function(
    "React",
    "useState",
    "useRef",
    "useMemo",
    "useEffect",
    "useFolderSelection",
    "rowIdForEntry",
    "List",
    "LIVE_RENDERED_RESULTS",
    "displayRows",
    "chooseListView",
    "rowsCanChange",
    "deriveProgress",
    code,
  )(
    React,
    React.useState,
    React.useRef,
    React.useMemo,
    React.useEffect,
    useFolderSelection,
    rowIdForEntry,
    ObservedList,
    LIVE_RENDERED_RESULTS,
    displayRows,
    chooseListView,
    rowsCanChange,
    deriveProgress,
  );
  const rows = Array.from({ length: 2000 }, (_, i) => ({
    entry: { path: `/foo/bar${i}`, name: `bar${i}` },
  }));
  for (const length of [0, 1, 49, 50, 51, 100, 2000]) {
    const input = Object.freeze(rows.slice(0, length));
    for (const selected of [
      undefined,
      "/missing",
      "/foo/bar0",
      "/foo/bar99",
      "/foo/bar1999",
    ]) {
      const output = displayRows(input, selected);
      assert(
        output.length === Math.min(length, 50) &&
          new Set(output).size === output.length &&
          output.every(
            (row, i) =>
              i === 0 || rows.indexOf(output[i - 1]) < rows.indexOf(row),
          ),
        `display subset stays bounded, unique, and ordered (${length} rows, ${selected ?? "no selection"})`,
      );
    }
  }
  assert(
    displayRows(rows).length === 50,
    "a large result set mounts only 50 rows",
  );
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(React.createElement(View, { rows: [] }));
    });
    const list = () => renderer!.root.findByType("list").props;
    assert(
      list().selectedId === null,
      "startup waits for results before selecting",
    );
    await act(() => renderer!.update(React.createElement(View, { rows })));
    await act(() => list().onSelectionChange("1:/foo/bar4"));
    assert(
      list().selectedId === "1:/foo/bar0",
      "startup selects the first result when rows arrive",
    );
    assert(
      list().entries.length === 50 && list().entries[49] === rows[49],
      "the displayed subset preserves the first 50 ranked rows",
    );
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    assert(
      list().selectedId === "1:/foo/bar0",
      "startup acknowledgement preserves the initial memory target",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, { rows: [...rows].reverse() }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar0",
      "startup focus remains on the memory target after delayed reranking",
    );
    await act(() => list().onSelectionChange("1:/foo/bar1999"));
    await act(() => renderer!.update(React.createElement(View, { rows })));
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    await act(() => list().onSelectionChange("1:/foo/bar1"));
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    await act(() =>
      renderer!.update(
        React.createElement(View, { rows: [...rows].reverse() }),
      ),
    );
    assert(
      list().entries.length <= LIVE_RENDERED_RESULTS &&
        list().entries.some(
          (row: (typeof rows)[number]) => row.entry.path === "/foo/bar0",
        ),
      "reranking retains the selected item without mounting all 2,000 rows",
    );
    assert(
      list().entries[48] === rows[1951] &&
        list().entries[49] === rows[0] &&
        rows.length === 2000,
      "selection replaces only the last visible row and leaves source results intact",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { rows, query: "baz" })),
    );
    assert(
      list().entries.length === 50,
      "a new query retains the same display budget",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "parent",
          rows,
          initialSelectionPath: "/foo/bar1999",
        }),
      ),
    );
    assert(
      list().entries.length <= LIVE_RENDERED_RESULTS &&
        list().entries.some(
          (row: (typeof rows)[number]) => row.entry.path === "/foo/bar1999",
        ),
      "parent-folder focus admits its target without rendering all intervening rows",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "memory",
          rows,
          instantRows: rows.slice(4),
          rankingReady: false,
        }),
      ),
    );
    assert(
      list().selectedId === null,
      "the browser does not request focus before ranking data allows rows to render",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "memory",
          rows,
          instantRows: rows.slice(4),
        }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar0",
      "the browser selects the first row of the settled list, whatever the source order",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "parent-loading",
          rows,
          initialSelectionPath: "/foo/bar1999",
          rankingReady: false,
        }),
      ),
    );
    assert(
      list().selectedId === null,
      "parent selection also waits for its rows to be rendered",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "parent-loading",
          rows,
          initialSelectionPath: "/foo/bar1999",
        }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar1999",
      "the restored parent target takes priority over the first row once rows render",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "late-parent",
          rows: rows.slice(0, 1),
          initialSelectionPath: "/foo/bar1999",
        }),
      ),
    );
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    commits.length = 0;
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "late-parent",
          rows,
          initialSelectionPath: "/foo/bar1999",
        }),
      ),
    );
    const parentFocused = commits.findIndex(
      (commit) => commit.selectedId === "1:/foo/bar1999",
    );
    assert(
      parentFocused > 0 &&
        commits
          .slice(0, parentFocused)
          .some(
            (commit) =>
              commit.paths.includes("/foo/bar1999") &&
              commit.selectedId === null,
          ),
      "a late parent target is also rendered before requesting focus despite an intermediate native selection",
    );
    /*
     * Selection waits for the settled list.
     *
     * The rows are held until no stage is still running, so there is no interim
     * row to latch onto. One predicate gates the rows and the selection
     * together; these check that an interim publication cannot take the
     * selection and that the finished list's first row does.
     */
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "settling",
          rows: [rows[72]],
          computing: true,
        }),
      ),
    );
    assert(
      list().selectedId === null,
      "no row is selected while the list is still settling",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { key: "settling", rows })),
    );
    assert(
      list().selectedId === "1:/foo/bar0",
      "the settled list selects its first row",
    );
    /*
     * A memory result that ranks last does not take the selection.
     *
     * This is the shape that produced a selected bottom row: a frequently
     * opened shared folder is the top memory candidate, but the merged ranking
     * puts it last because the query only matches its name by letters in
     * order. Selection used to target the first memory row, so it landed
     * there, and `displayRows` then pinned it to the end of the list.
     */
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "memory-ranks-last",
          rows,
          instantRows: [rows[1999]],
          query: "ranks-last",
        }),
      ),
    );
    assert(
      String(list().selectedId).endsWith(":/foo/bar0"),
      `the top memory candidate ranking last does not take the selection (${String(list().selectedId)})`,
    );
    assert(
      list().entries[0].entry.path === "/foo/bar0",
      "row 1 of the merged ranking is what gets selected",
    );

    /*
     * Row 1 stays selected even when a previous selection ranked far down.
     *
     * `displayRows` replaces the last visible row with the retained selection
     * when that selection falls outside the first hundred, which is how a
     * previously opened item can appear at the bottom of the list and hold the
     * highlight. A new query must not inherit it.
     */
    await act(() =>
      renderer!.update(
        React.createElement(View, { key: "stale-pick", rows, query: "one" }),
      ),
    );
    const picked = String(list().selectedId).split(":")[0];
    await act(() => list().onSelectionChange(`${picked}:/foo/bar1999`));
    await act(() =>
      renderer!.update(
        React.createElement(View, { key: "stale-pick", rows, query: "two" }),
      ),
    );
    assert(
      String(list().selectedId).endsWith(":/foo/bar0"),
      `a new query selects row 1, not the row selected under the previous query (${String(list().selectedId)})`,
    );
    assert(
      list().entries[0].entry.path === "/foo/bar0" &&
        !list().entries.some(
          (row: { entry: { path: string } }) =>
            row.entry.path === "/foo/bar1999",
        ),
      "and the previous selection is no longer pinned to the end of the list",
    );

    /*
     * Entering a folder for the first time.
     *
     * The reported shape: a small folder's listing finishes before the
     * background reads do, so the rows exist while a stage is still running.
     * Before the newest file is ranked it sorts first, and afterwards it sorts
     * third. Rendering those rows while withholding the selection request let
     * Raycast select row 1 of the unranked order and then keep that same item
     * selected as the ranking moved it down, which is how the third row ended
     * up selected on a first visit.
     */
    const unranked = [rows[3], rows[0], rows[1], rows[2]];
    commits.length = 0;
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "first-visit",
          rows: unranked,
          computing: true,
        }),
      ),
    );
    assert(
      list().entries.length === 0 && list().selectedId === null,
      `rows are held while a stage can still reorder them (${list().entries.length} rendered)`,
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "first-visit",
          rows: [rows[0], rows[1], rows[3], rows[2]],
        }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar0",
      `the first visit selects row 1 of the ranked list (${String(list().selectedId)})`,
    );
    assert(
      !commits.some((commit) => commit.paths[0] === "/foo/bar3"),
      "and the unranked order was never rendered for Raycast to select from",
    );

    function LaggingList({ finished }: { finished: boolean }) {
      const [entries, setEntries] = React.useState([rows[72]]);
      React.useEffect(() => {
        if (finished) setEntries(rows);
      }, [finished]);
      return React.createElement(View, {
        rows: entries,
        computing: !finished,
      });
    }
    await act(() =>
      renderer!.update(React.createElement(LaggingList, { finished: false })),
    );
    commits.length = 0;
    await act(() =>
      renderer!.update(React.createElement(LaggingList, { finished: true })),
    );
    assert(
      list().selectedId === "1:/foo/bar0" &&
        !commits.some((commit) => commit.selectedId === "1:/foo/bar72"),
      "a publication queued by an effect never latches the interim row",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
