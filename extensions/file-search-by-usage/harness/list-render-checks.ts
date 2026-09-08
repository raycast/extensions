import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { useFolderSelection } from "../src/components/use-folder-selection";
import { rowIdForEntry } from "../src/lib/entry-identity";
import { LIVE_RENDERED_RESULTS } from "../src/lib/search-limits";
import { useEventHandles } from "../src/components/use-event-handles";

/** Exercise the actual browser selection/pagination boundary with native callbacks. */
export async function listRenderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const start = source.indexOf("  const { selectedId");
  const end = source.indexOf("\n  const rowHandlers", start);
  const paging = source.slice(
    source.indexOf("      pagination={{", end),
    source.indexOf("      selectedItemId=", end),
  );
  const resetStart = source.indexOf("  // Reset row IDs for a new query;");
  const reset = source.slice(
    resetStart,
    source.indexOf("  const onSearchTextChange", resetStart),
  );
  const code = transformSync(
    `return function View({ rows, initialSelectionPath, query = "", restorationRevision = 0 }) {
    const [generation, setGeneration] = useState(0);
    const parsed = { normalized: query }, dir = undefined;
    const [visibleCount, setVisibleCount] = useState(200);
    const selectionPathRef = useRef();
    const event = useEventHandles();
    ${reset}
    ${source.slice(start, end)}
    return <List ${paging} count={renderedCount}
      entries={typeof renderedRows === "undefined" ? rows.slice(0, renderedCount) : renderedRows}
      selectedId={selectedId} onSelectionChange={onSelectionChange} />;
  }`,
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
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
    "useEventHandles",
    code,
  )(
    React,
    React.useState,
    React.useRef,
    React.useMemo,
    React.useEffect,
    useFolderSelection,
    rowIdForEntry,
    "list",
    LIVE_RENDERED_RESULTS,
    useEventHandles,
  );
  const rows = Array.from({ length: 2000 }, (_, i) => ({
    entry: { path: `/foo/bar${i}`, name: `bar${i}` },
  }));
  assert(
    LIVE_RENDERED_RESULTS === 100,
    "the live list has a 100-row memory ceiling",
  );
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(React.createElement(View, { rows }));
    });
    const list = () => renderer!.root.findByType("list").props;
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
    const staleLoadMore = list().pagination.onLoadMore;
    await act(() => {
      for (let i = 0; i < 30; i++) staleLoadMore();
    });
    assert(
      list().count === Math.min(400, LIVE_RENDERED_RESULTS),
      "duplicate load-more notifications for one page admit only one next page",
    );
    const latePage = list().pagination.onLoadMore;
    for (let i = 0; i < 20; i++)
      await act(() => list().pagination.onLoadMore());
    assert(
      list().count <= LIVE_RENDERED_RESULTS &&
        list().entries.length <= LIVE_RENDERED_RESULTS &&
        !list().pagination.hasMore,
      "late pagination notifications cannot grow state beyond the result count",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { rows, query: "baz" })),
    );
    await act(() => latePage());
    assert(
      list().count === Math.min(200, LIVE_RENDERED_RESULTS),
      "a callback from a later page cannot expand a new query's first page",
    );
    await act(() => staleLoadMore());
    assert(
      list().count === Math.min(200, LIVE_RENDERED_RESULTS),
      "a callback from an old query is ignored even when page counts match",
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
    for (let i = 0; i < 30; i++)
      await act(() => list().pagination.onLoadMore());
    assert(
      list().entries.length <= LIVE_RENDERED_RESULTS &&
        !list().pagination.hasMore,
      "automatic paging toward a restored selection stops at the display budget",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
