import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { columnWidths } from "../src/lib/accessory-columns";
import {
  compactScopeLabel,
  formatDuration,
  formatIndexBytes,
  formatSize,
  relativeTime,
} from "../src/lib/format";
import { act, create, ReactTestRenderer } from "react-test-renderer";

const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;
const TB = 1024 * GB;
/** What every formatter answers for a number it cannot render. */
const DASH = "\u2014";

/**
 * src/lib/format.ts, the text of every row and of the Index Stats block.
 *
 * Every formatter here answers a single dash for a number it cannot render, so
 * an unreadable size or duration says so instead of printing "NaN KB". The two
 * byte formatters still disagree once past 10 units or a terabyte, which is
 * deliberate: Disk Usage keeps one decimal and stops at GB. The divergence
 * cases pin that, so a later cleanup has to be a deliberate one.
 */
function formatChecks(assert: (ok: boolean, label: string) => void) {
  // arrange: [input, expected, how the case is described in the label]
  const sizeCases: [number, string, string][] = [
    [0, "0 B", "zero"],
    [-1, "0 B", "a negative count"],
    [1, "1 B", "one byte"],
    [1023, "1023 B", "one below a kilobyte"],
    [KB, "1.0 KB", "exactly a kilobyte"],
    [1025, "1.0 KB", "one above a kilobyte"],
    [10 * KB, "10 KB", "exactly ten kilobytes, where it drops the decimal"],
    [10 * KB - 1, "10.0 KB", "a hair under ten kilobytes, which keeps one"],
    [MB, "1.0 MB", "exactly a megabyte"],
    [GB, "1.0 GB", "exactly a gigabyte"],
    [TB, "1.0 TB", "exactly a terabyte"],
    [1024 * TB, "1024 TB", "a petabyte, held at the last unit"],
    [1536.5, "1.5 KB", "a fractional byte count"],
    [0.5, "512 undefined", "half a byte, which indexes past the unit list"],
    [NaN, DASH, "NaN"],
    [Infinity, DASH, "Infinity"],
  ];
  const indexCases: [number, string, string][] = [
    [0, "0 B", "zero"],
    [-1, DASH, "a negative count"],
    [1, "1 B", "one byte"],
    [1023, "1023 B", "one below a kilobyte"],
    [KB, "1.0 KB", "exactly a kilobyte"],
    [1025, "1.0 KB", "one above a kilobyte"],
    [10 * KB, "10.0 KB", "exactly ten kilobytes, decimal kept"],
    [MB, "1.0 MB", "exactly a megabyte"],
    [GB, "1.0 GB", "exactly a gigabyte"],
    [TB, "1024.0 GB", "a terabyte, which it counts in gigabytes"],
    [1024 * TB, "1048576.0 GB", "a petabyte, still in gigabytes"],
    [1536.5, "1.5 KB", "a fractional byte count"],
    [0.5, "0.5 B", "half a byte"],
    [NaN, DASH, "NaN"],
    [Infinity, DASH, "Infinity"],
  ];
  // The Index Stats string must not change, so the disagreement is the point.
  const divergentCases: [number, string, string, string][] = [
    [
      10 * KB,
      "10 KB",
      "10.0 KB",
      "formatSize drops the decimal at ten units and Disk Usage never does",
    ],
    [
      512 * KB,
      "512 KB",
      "512.0 KB",
      "formatSize drops the decimal at ten units and Disk Usage never does",
    ],
    [
      TB,
      "1.0 TB",
      "1024.0 GB",
      "formatSize carries on to TB and Disk Usage stops at GB",
    ],
    [
      1024 * TB,
      "1024 TB",
      "1048576.0 GB",
      "formatSize carries on to TB and Disk Usage stops at GB",
    ],
    [
      512 * GB,
      "512 GB",
      "512.0 GB",
      "formatSize drops the decimal above 10 units and Disk Usage keeps it",
    ],
  ];
  const durationCases: [number, string, string][] = [
    [0, "0ms", "zero"],
    [1, "1ms", "one millisecond"],
    [999, "999ms", "one below a second"],
    [1000, "1s", "exactly one second"],
    [1499, "1s", "just under one and a half seconds"],
    [1500, "2s", "one and a half seconds, rounded up"],
    [60_000, "1m 0s", "exactly one minute"],
    [90_000, "1m 30s", "a minute and a half"],
    [3_600_000, "1h 0m 0s", "an hour"],
    [3_661_000, "1h 1m 1s", "an hour, a minute and a second"],
    [36_061_000, "10h 1m 1s", "ten hours"],
    [-1, DASH, "a negative millisecond"],
    [-60_000, DASH, "a negative minute"],
    [NaN, DASH, "NaN"],
  ];
  // A pinned clock, so every boundary below lands where the case says it does.
  const now = Date.UTC(2024, 5, 15, 12, 0, 0);
  const relativeCases: [number, string, string][] = [
    [0, "—", "a missing timestamp"],
    [now, "just now", "the present instant"],
    [now - 29_999, "just now", "just under half a minute"],
    [now - 30_000, "just now", "half a minute, which is not yet a minute"],
    [now - 60_000, "1m ago", "exactly one minute"],
    [now - 59 * 60_000, "59m ago", "one minute below the hour"],
    [now - 3_600_000, "1h ago", "exactly one hour"],
    [now - 23 * 3_600_000, "23h ago", "one hour below the day"],
    [now - 24 * 3_600_000, "1d ago", "exactly one day"],
    [now - 29 * 864e5, "29d ago", "one day below the month cut"],
    [now - 30 * 864e5, "1mo ago", "exactly thirty days"],
    [now - 330 * 864e5, "11mo ago", "eleven months"],
    [now - 360 * 864e5, "1y ago", "twelve months of thirty days"],
    [
      now - 1000 * 864e5,
      "2y ago",
      "a thousand days, which is not yet three years",
    ],
    [now + 60_000, "in 1m", "a timestamp one minute in the future"],
    [now + 40 * 864e5, "in 1mo", "a timestamp well in the future"],
    [now + 30_000, "just now", "a timestamp barely in the future"],
  ];
  const scopeCases: [string, string, string][] = [
    ["", "", "an empty scope"],
    ["/Users", "/Users", "a single component"],
    ["/Users/example", "/Users/example", "two components, left whole"],
    ["/a/b/c", "…/b/c", "exactly three components, cut to the last two"],
    ["relative/path/here", "…/path/here", "a relative path of three"],
    ["///", "///", "nothing but separators"],
    ["a\nb", "a b", "a newline inside a single component"],
    ["/a\n\tb/c/d\te", "…/c/d e", "newlines and tabs across three components"],
    [
      `/one/${"b".repeat(50)}`,
      `/one/${"b".repeat(20)}…${"b".repeat(14)}`,
      "a long two-component path, elided in the middle",
    ],
    [
      `/root/${"a".repeat(30)}/${"b".repeat(30)}`,
      `…/${"a".repeat(23)}…${"b".repeat(14)}`,
      "a long three-component path, elided twice",
    ],
  ];
  const wallClock = Date.now();
  const defaultNowCases: [number, string, string][] = [
    [0, "—", "a missing timestamp"],
    [wallClock, "just now", "the current instant"],
    [wallClock - 3 * 3_600_000, "3h ago", "three hours back"],
    [wallClock - 5 * 864e5, "5d ago", "five days back"],
  ];

  // act
  const sizes = sizeCases.map(([bytes]) => formatSize(bytes));
  const indexSizes = indexCases.map(([value]) => formatIndexBytes(value));
  const divergent = divergentCases.map(([value]) => [
    formatSize(value),
    formatIndexBytes(value),
  ]);
  const durations = durationCases.map(([ms]) => formatDuration(ms));
  const relatives = relativeCases.map(([ms]) => relativeTime(ms, now));
  const scopes = scopeCases.map(([scope]) => compactScopeLabel(scope));
  const defaults = defaultNowCases.map(([ms]) => relativeTime(ms));

  // assert
  sizeCases.forEach(([, expected, note], i) =>
    assert(
      sizes[i] === expected,
      `formatSize renders ${note} as "${expected}" (got "${sizes[i]}")`,
    ),
  );
  indexCases.forEach(([, expected, note], i) =>
    assert(
      indexSizes[i] === expected,
      `formatIndexBytes renders ${note} as "${expected}" (got "${indexSizes[i]}")`,
    ),
  );
  divergentCases.forEach(([value, size, index, reason], i) =>
    assert(
      divergent[i][0] === size &&
        divergent[i][1] === index &&
        divergent[i][0] !== divergent[i][1],
      `at ${value} bytes the two formatters must keep disagreeing, because ${reason}`,
    ),
  );
  durationCases.forEach(([, expected, note], i) =>
    assert(
      durations[i] === expected,
      `formatDuration renders ${note} as "${expected}" (got "${durations[i]}")`,
    ),
  );
  relativeCases.forEach(([, expected, note], i) =>
    assert(
      relatives[i] === expected,
      `relativeTime against a pinned clock renders ${note} as "${expected}" (got "${relatives[i]}")`,
    ),
  );
  scopeCases.forEach(([, expected, note], i) =>
    assert(
      scopes[i] === expected,
      `compactScopeLabel renders ${note} as "${expected}" (got "${scopes[i]}")`,
    ),
  );
  assert(
    scopes.every((label) => Array.from(label).length <= 40),
    "no scope label runs past forty characters",
  );
  defaultNowCases.forEach(([, expected, note], i) =>
    assert(
      defaults[i] === expected,
      `relativeTime without a pinned clock renders ${note} as "${expected}" (got "${defaults[i]}")`,
    ),
  );
}

/** Count actual JSX allocations, including trees Raycast never mounts. */
export async function rowRenderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  formatChecks(assert);
  let selected = "row-0";
  let isDirectory = true;
  let menuElements = 0;
  let detailElements = 0;
  const component = (name: string) =>
    Object.assign(
      (props: { children?: React.ReactNode; metadata?: React.ReactNode }) =>
        React.createElement(
          name,
          props,
          name === "detail" ? props.metadata : props.children,
        ),
      { displayName: name },
    );
  const Item = Object.assign(
    (props: {
      id: string;
      actions: React.ReactNode;
      detail: React.ReactNode;
    }) =>
      props.id === selected
        ? React.createElement(React.Fragment, null, props.actions, props.detail)
        : null,
    {
      Detail: Object.assign(component("detail"), {
        Metadata: Object.assign(component("metadata"), {
          Label: component("metadata-label"),
          Separator: component("metadata-separator"),
        }),
      }),
    },
  );
  const api = {
    List: { Item },
    Action: Object.assign(component("action"), {
      ToggleQuickLook: "action-quicklook",
      ShowInFinder: "action-finder",
      OpenWith: "action-openwith",
      CopyToClipboard: "action-copy",
      Trash: "action-trash",
      Style: { Destructive: "destructive" },
    }),
    ActionPanel: Object.assign(component("action-panel"), {
      Section: "action-section",
    }),
    Icon: new Proxy({}, { get: (_target, key) => key }),
    Keyboard: {
      Shortcut: {
        Common: {
          Open: { modifiers: ["cmd"], key: "o" },
          MoveDown: { modifiers: ["cmd", "opt"], key: "arrowDown" },
          MoveUp: { modifiers: ["cmd", "opt"], key: "arrowUp" },
          CopyName: { modifiers: ["cmd", "opt"], key: "c" },
          Copy: { modifiers: ["cmd", "shift"], key: "c" },
        },
      },
    },
  };
  const output = buildSync({
    entryPoints: ["src/components/row.tsx"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    external: ["@raycast/api", "react"],
    jsx: "transform",
    jsxFactory: "element",
    jsxFragment: "React.Fragment",
    tsconfigRaw: { compilerOptions: { jsx: "react" } },
  }).outputFiles[0].text;
  const nativeRequire = createRequire(path.resolve("package.json"));
  const module = {
    exports: {} as { Row: React.ComponentType<Record<string, unknown>> },
  };
  const element = (
    ...[type, props, ...children]: Parameters<typeof React.createElement>
  ) => {
    const name =
      typeof type === "string"
        ? type
        : ((type as { displayName?: string }).displayName ?? "");
    if (name.startsWith("action")) menuElements++;
    if (name.startsWith("metadata") || type === Item.Detail) detailElements++;
    return React.createElement(type, props, ...children);
  };
  new Function("require", "module", "exports", "element", "React", output)(
    (id: string) => (id === "@raycast/api" ? api : nativeRequire(id)),
    module,
    module.exports,
    element,
    React,
  );
  const calls: string[] = [];
  const handlers = {
    onOpen: (entry: { path: string }) => calls.push(entry.path),
    onDescend: (entry: { path: string }) => calls.push(`enter:${entry.path}`),
    onUp: () => calls.push("up"),
    onHistoryBack: () => calls.push("previous"),
    onHistoryForward: () => calls.push("next"),
    onToggleHidden: () => calls.push("hidden"),
    onReturnToStart: (() => calls.push("start")) as (() => void) | undefined,
  };
  const rows = () =>
    React.createElement(
      React.Fragment,
      null,
      Array.from({ length: 500 }, (_, i) =>
        React.createElement(module.exports.Row, {
          key: i,
          id: `row-${i}`,
          entry: {
            path: `/foo/bar${i}`,
            name: `bar${i}`,
            isDirectory,
            size: 0,
            mtimeMs: 0,
            birthtimeMs: 0,
          },
          score: {
            total: 0,
            visit: 0,
            mtime: 0,
            spotlight: 0,
            depth: 0,
            match: 0,
          },
          showScore: false,
          columns: { visits: 0, score: 0, time: 0 },
          showingDetail: true,
          pinned: false,
          handlers,
        }),
      ),
    );
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(rows());
    });
    assert(
      menuElements < 100,
      `500 rows construct only the selected action menu (${menuElements} elements)`,
    );
    assert(
      detailElements < 100,
      `500 rows construct only the selected details (${detailElements} elements)`,
    );
    selected = "row-499";
    menuElements = detailElements = 0;
    await act(() => renderer!.update(rows()));
    assert(
      menuElements < 100 && detailElements < 100,
      "changing selection does not build 500 menus or detail panels",
    );
    const actions = renderer!.root.findAllByType("action");
    const checkPrimaryActions = () => {
      const ordered = renderer!.root.findAll(
        (item) =>
          typeof item.type === "string" &&
          [
            "action",
            "action-finder",
            "action-quicklook",
            "action-openwith",
            "action-copy",
            "action-trash",
          ].includes(item.type),
      );
      assert(
        ordered[0]?.props.title === (isDirectory ? "Open in Finder" : "Open") &&
          ordered
            .slice(0, 4)
            .map((item) => item.type)
            .join(",") ===
            "action,action-finder,action-quicklook,action-openwith" &&
          ordered[1]?.props.path === "/foo/bar499",
        `${isDirectory ? "folder" : "file"} menu reserves the secondary Command-Return action for Show in Finder and follows File Search order`,
      );
    };
    checkPrimaryActions();
    const action = (title: string) =>
      actions.find((item) => item.props.title === title)!;
    const hiddenAction = action("Toggle Hidden Files");
    const returnAction = action("Return to Start");
    returnAction?.props.onAction();
    assert(
      calls.pop() === "start" &&
        returnAction?.props.shortcut?.key === "h" &&
        returnAction?.props.shortcut?.modifiers.join() === "cmd,shift",
      "Return to Start registers Command-Shift-H and dispatches the reset",
    );
    hiddenAction?.props.onAction();
    assert(
      calls.pop() === "hidden" &&
        hiddenAction?.props.shortcut.modifiers.slice().sort().join() ===
          "cmd,shift" &&
        hiddenAction?.props.shortcut.key === ".",
      "Toggle Hidden Files uses shift-command-period and invokes its handler",
    );
    assert(
      !action("Back to Previous Folder") &&
        !actions.some(
          (item) =>
            item.props.shortcut?.key === "arrowLeft" &&
            item.props.shortcut.modifiers.join() === "opt",
        ),
      "result actions do not expose removed folder-history navigation",
    );
    action("Open in Finder").props.onAction();
    action("Navigate into Folder").props.onAction();
    action("Go to Parent Folder").props.onAction();
    assert(
      calls.join(",") === "/foo/bar499,enter:/foo/bar499,up",
      "deferred actions operate on the newly selected item",
    );
    assert(
      actions.every((item) => item.props.title !== "Set Up Search"),
      "result actions do not offer the removed setup run",
    );
    action("Previous Search").props.onAction();
    action("Next Search").props.onAction();
    assert(
      calls.slice(-2).join() === "previous,next" &&
        action("Previous Search").props.shortcut.key === "[" &&
        action("Next Search").props.shortcut.key === "]" &&
        action("Previous Search").props.shortcut.modifiers.join() === "cmd" &&
        action("Next Search").props.shortcut.modifiers.join() === "cmd",
      "search-history actions preserve callbacks and command-bracket shortcuts",
    );
    assert(
      action("Go to Parent Folder").props.shortcut ===
        api.Keyboard.Shortcut.Common.MoveUp &&
        action("Navigate into Folder").props.shortcut ===
          api.Keyboard.Shortcut.Common.MoveDown,
      "deferred folder actions retain their navigation shortcuts",
    );
    const copies = renderer!.root.findAllByType("action-copy");
    const copy = (title: string) =>
      copies.find((item) => item.props.title === title)!.props;
    assert(
      copy("Copy Name").shortcut === api.Keyboard.Shortcut.Common.CopyName &&
        copy("Copy Name").content === "bar499" &&
        copy("Copy File").shortcut === api.Keyboard.Shortcut.Common.Copy &&
        copy("Copy File").content.file === "/foo/bar499",
      "copy actions use Raycast shortcuts and preserve name versus file payloads",
    );
    assert(
      renderer!.root.findByType("action-openwith").props.path ===
        "/foo/bar499" &&
        renderer!.root.findByType("action-finder").props.path === "/foo/bar499",
      "Open With and Show in Finder follow the selected path",
    );
    for (const [type, modifiers, key] of [
      ["action-finder", "cmd", "return"],
      ["action-openwith", "cmd", "o"],
      ["action-trash", "ctrl", "x"],
    ]) {
      const props = renderer!.root.findByType(type).props;
      assert(
        props.shortcut?.modifiers.join() === modifiers &&
          props.shortcut?.key === key,
        `${type} registers the Raycast File Search shortcut`,
      );
    }
    assert(
      renderer!.root
        .findAllByType("metadata-label")
        .some(
          (item) =>
            item.props.title === "Path" && item.props.text === "/foo/bar499",
        ),
      "deferred details show the selected file",
    );
    isDirectory = false;
    await act(() => renderer!.update(rows()));
    checkPrimaryActions();
    handlers.onReturnToStart = undefined;
    await act(() => renderer!.update(rows()));
    assert(
      !renderer!.root
        .findAllByType("action")
        .some((item) => item.props.title === "Return to Start"),
      "the initial search screen does not offer a redundant reset action",
    );

    /*
     * The accessories, as the component actually builds them.
     *
     * The order is opens, score, modified date, and every row carries every
     * cell at its column's width. One row has no open count and one is
     * pinned, which are the two cases that used to shift a row's columns
     * sideways relative to its neighbours.
     */
    const sample = [
      { visits: 1, score: 305, mtimeMs: Date.now() - 29 * 864e5, pinned: true },
      { visits: undefined, score: 147, mtimeMs: Date.now() - 3 * 36e5 },
      { visits: 12, score: 51, mtimeMs: Date.now() - 240 * 864e5 },
    ];
    const widths = columnWidths(
      sample.map((row) => ({
        visits: row.visits,
        score: row.score,
        time: relativeTime(row.mtimeMs),
      })),
    );
    await act(() => {
      renderer!.update(
        React.createElement(
          React.Fragment,
          null,
          sample.map((row, i) =>
            React.createElement(module.exports.Row, {
              key: `col-${i}`,
              id: `col-${i}`,
              entry: {
                path: `/foo/col${i}`,
                name: `col${i}`,
                isDirectory: false,
                size: 0,
                mtimeMs: row.mtimeMs,
                birthtimeMs: 0,
              },
              visit: row.visits ? { count: row.visits } : undefined,
              score: {
                total: row.score,
                visit: 0,
                mtime: 0,
                spotlight: 0,
                depth: 0,
                match: 0,
              },
              showScore: true,
              columns: widths,
              showingDetail: false,
              pinned: row.pinned ?? false,
              handlers,
            }),
          ),
        ),
      );
    });
    const rendered = renderer!.root
      .findAllByType(Item)
      .map((item) => item.props.accessories as Record<string, string>[]);
    const width = (cell: string) => cell.replaceAll("\u200B", "").length;
    assert(
      rendered.length === sample.length &&
        rendered.every((row) => row.length === 4),
      `every row has a pin slot and three columns (${rendered.map((row) => row.length).join()})`,
    );
    assert(
      rendered.every(
        (row) =>
          width(row[1].text) === widths.visits &&
          width(row[2].tag) === widths.score &&
          width(row[3].text) === widths.time,
      ),
      "and each cell is exactly its column's width, whatever the row holds",
    );
    assert(
      rendered[0][1].text.includes("1×") &&
        rendered[2][1].text.includes("12×") &&
        !rendered[1][1].text.includes("×"),
      "the open count comes first, and a row without one still holds the column",
    );
    assert(
      rendered[0][2].tag.includes("305") && rendered[0][3].text.includes("29d"),
      "the score comes next, then the modified date",
    );
    assert(
      rendered[0][0].icon === api.Icon.Pin &&
        rendered[1][0].icon === "blank.png",
      "the pin slot is the same box whether or not the item is pinned",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
