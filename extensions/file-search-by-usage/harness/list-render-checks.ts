import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { useFolderSelection } from "../src/components/use-folder-selection";
import { rowIdForEntry } from "../src/lib/entry-identity";
import { LIVE_RENDERED_RESULTS } from "../src/lib/search-limits";
import { displayRows } from "../src/lib/display-rows";
import * as format from "../src/lib/format";
import { describeProgress } from "../src/lib/progress";

/** Exercise the browser's bounded display and native selection boundary. */
export async function listRenderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const headingStart = source.indexOf("  const scopeLabel =");
  const sectionStart = source.lastIndexOf("<List.Section");
  const headingCode = transformSync(
    source.slice(headingStart, source.indexOf("  const { selectedId")) +
      "\nreturn (" +
      source.slice(sectionStart, source.indexOf(">", sectionStart) + 1) +
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
  const start = source.indexOf("  const { selectedId");
  const end = source.indexOf("\n  const rowHandlers", start);
  const resetStart = source.indexOf("  // Reset row IDs for a new query;");
  const reset = source.slice(
    resetStart,
    source.indexOf("  const onSearchTextChange", resetStart),
  );
  const code = transformSync(
    `return function View({ rows, initialSelectionPath, query = "", restorationRevision = 0 }) {
    const [generation, setGeneration] = useState(0);
    const parsed = { normalized: query }, dir = undefined;
    ${reset}
    ${source.slice(start, end)}
    return <List entries={renderedRows}
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
    "displayRows",
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
    displayRows,
  );
  const rows = Array.from({ length: 2000 }, (_, i) => ({
    entry: { path: `/foo/bar${i}`, name: `bar${i}` },
  }));
  for (const length of [0, 1, 99, 100, 101, 2000]) {
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
        output.length === Math.min(length, 100) &&
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
      list().entries.length === 100 && list().entries[99] === rows[99],
      "the displayed subset preserves the first 100 ranked rows",
    );
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    assert(
      list().selectedId === "1:/foo/bar0",
      "startup acknowledgement keeps focus at the top during initial loading",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, { rows: [...rows].reverse() }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar1999",
      "startup focus follows the first result after delayed reranking",
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
      list().entries[98] === rows[1901] &&
        list().entries[99] === rows[0] &&
        rows.length === 2000,
      "selection replaces only the last visible row and leaves source results intact",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { rows, query: "baz" })),
    );
    assert(
      list().entries.length === 100,
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
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
