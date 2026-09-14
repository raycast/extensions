import { rankSources, RankContext } from "../src/lib/rank-sources";
import { parseQuery } from "../src/lib/query";
import { Entry, SortMode } from "../src/lib/types";

export function rankSourcesChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const now = 1_700_000_000_000;
  const entry = (path: string, extra: Partial<Entry> = {}): Entry => ({
    name: path.split("/").at(-1)!,
    path,
    isDirectory: false,
    isSymlink: false,
    size: 0,
    mtimeMs: 0,
    birthtimeMs: 0,
    ...extra,
  });
  const rank = (
    sources: Entry[],
    query = "",
    options: Partial<RankContext> = {},
  ) =>
    rankSources(sources, {
      now,
      tick: 0,
      visits: {},
      learned: new Set(),
      parsed: parseQuery(query),
      effectiveQuery: query,
      pathQuery: false,
      showHidden: false,
      sortMode: "usage",
      ...options,
    });

  assert(rank([]).length === 0, "ranking accepts an empty source list");
  const original = Object.freeze(entry("/scope/report.txt"));
  const merged = rank([original, entry(original.path, { useCount: 9 })]);
  assert(
    merged.length === 1 &&
      merged[0].entry.useCount === 9 &&
      original.useCount === undefined,
    "duplicate sources merge usage metadata without mutating the original entry",
  );
  assert(
    rank(
      [
        entry("/scope/report.txt"),
        entry("/scope/nested/report.txt"),
        entry("/else/report.txt"),
      ],
      "report",
      { dir: "/scope" },
    )
      .map((row) => row.entry.path)
      .join() === "/scope/report.txt",
    "all ranking sources obey the direct-child folder boundary",
  );
  assert(
    rank(
      [entry("/alias/report.txt", { storagePath: "/scope/report.txt" })],
      "report",
      { dir: "/visible", canonicalDir: "/scope" },
    ).length === 1,
    "canonical direct children remain visible through folder aliases",
  );
  assert(
    rank([entry("/scope/.hidden")]).length === 0 &&
      rank([entry("/scope/.hidden")], "", { showHidden: true }).length === 1,
    "hidden visibility is applied before ranking",
  );
  assert(
    rank([entry("/scope/.hidden")], ".hid", { pathQuery: true }).length === 1,
    "explicit path-bar results retain their separately checked visibility",
  );
  assert(
    rank([entry("/budget/report.txt")], "budget").length === 1 &&
      rank([entry("/budget/report.txt")], "budget", { pathQuery: true })
        .length === 0,
    "ordinary queries may match parents but path-bar queries match names only",
  );

  const remembered = entry("/scope/unrelated.pdf");
  const learned = new Set([remembered.path]);
  assert(
    rank([entry("/scope/report.pdf"), remembered], "report", { learned })[0]
      .entry === remembered,
    "learned names outrank textual matches",
  );
  assert(
    rank([remembered], "report -d", { learned }).length === 0,
    "learned names still respect explicit type filters",
  );

  const aliases = [
    entry("/first/report.txt", { dev: 1, ino: 2 }),
    entry("/other/report.txt", { dev: 1, ino: 2, useCount: 10 }),
    entry("/third/shortcut.txt", { dev: 1, ino: 2 }),
  ];
  const deduped = rank(aliases);
  assert(
    deduped.length === 2 &&
      deduped.some((row) => row.entry.path === "/other/report.txt") &&
      deduped.some((row) => row.entry.name === "shortcut.txt"),
    "identity deduplication keeps the stronger route and differently named shortcuts",
  );

  const sortable = [
    entry("/scope/alpha", { mtimeMs: now, birthtimeMs: now - 1000, size: 1 }),
    entry("/scope/beta", { mtimeMs: now - 1000, birthtimeMs: now, size: 10 }),
  ];
  for (const [sortMode, first] of [
    ["name", "alpha"],
    ["modified", "alpha"],
    ["created", "beta"],
    ["size", "beta"],
  ] as [SortMode, string][]) {
    assert(
      rank(sortable, "", { sortMode })[0].entry.name === first,
      `${sortMode} sorting is preserved in source ranking`,
    );
  }
  assert(
    JSON.stringify(rank(sortable)) === JSON.stringify(rank(sortable)),
    "ranking is deterministic with an explicit wall clock",
  );
}
