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
    source.slice(
      headingStart,
      source.indexOf("  // Prefer the best fast result"),
    ) +
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
  const start = source.indexOf("  // Prefer the best fast result");
  const end = source.indexOf("\n  const rowHandlers", start);
  const resetStart = source.indexOf("  // Reset row IDs for a new query;");
  const reset = source.slice(
    resetStart,
    source.indexOf("  const onSearchTextChange", resetStart),
  );
  const code = transformSync(
    `return function View({ rows, instantRows = rows, rankingReady = true, searchActive = true, directoryPending = false, initialSelectionPath, query = "", restorationRevision = 0 }) {
    const [generation, setGeneration] = useState(0);
    const parsed = { normalized: query }, dir = undefined;
    const backgroundPending = false, cachedPending = false, recentFiles = { pending: false };
    ${reset}
    ${source.slice(start, end)}
    return <List entries={renderedRows}
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
      list().selectedId === "1:/foo/bar4",
      "the browser selects the highest-ranked admitted memory item, not the top Spotlight item",
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
      "the restored parent target takes priority over the top memory item once rows render",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "offscreen-memory",
          rows,
          instantRows: [],
          rankingReady: false,
        }),
      ),
    );
    await act(() => list().onSelectionChange("1:/foo/bar0"));
    commits.length = 0;
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "offscreen-memory",
          rows,
          instantRows: [rows[1999]],
        }),
      ),
    );
    const focused = commits.findIndex(
      (commit) => commit.selectedId === "1:/foo/bar1999",
    );
    assert(
      focused > 0 &&
        commits
          .slice(0, focused)
          .some(
            (commit) =>
              commit.paths.includes("/foo/bar1999") &&
              commit.selectedId === null,
          ),
      "an offscreen memory target is rendered in an earlier commit than its focus request",
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
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "directory-batch",
          rows: [rows[72]],
          directoryPending: true,
        }),
      ),
    );
    assert(
      list().selectedId === null,
      "the browser waits for an initial directory batch instead of latching the first enumerated file",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "directory-batch",
          rows,
        }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar0",
      "finishing the directory batch selects its ranked top item",
    );
    function LaggingDirectory({ finished }: { finished: boolean }) {
      const [entries, setEntries] = React.useState([rows[72]]);
      React.useEffect(() => {
        if (finished) setEntries(rows);
      }, [finished]);
      return React.createElement(View, {
        rows: entries,
        directoryPending: !finished,
      });
    }
    await act(() =>
      renderer!.update(
        React.createElement(LaggingDirectory, { finished: false }),
      ),
    );
    commits.length = 0;
    await act(() =>
      renderer!.update(
        React.createElement(LaggingDirectory, { finished: true }),
      ),
    );
    assert(
      list().selectedId === "1:/foo/bar0" &&
        !commits.some((commit) => commit.selectedId === "1:/foo/bar72"),
      "a directory publication queued by an effect updates the target before the first focus request",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
