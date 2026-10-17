import { compareRankedEntries, RankedEntry } from "../src/lib/result-order";
import { Entry, SortMode } from "../src/lib/types";

const entry = (
  name: string,
  values: Partial<
    Pick<Entry, "path" | "mtimeMs" | "birthtimeMs" | "size">
  > = {},
): Entry => ({
  name,
  path: `/foo/${name}`,
  isDirectory: false,
  isSymlink: false,
  size: 0,
  mtimeMs: 0,
  birthtimeMs: 0,
  ...values,
});

/** Direct tests for the ordering contract shared by every result source. */
export function resultOrderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const candidates: RankedEntry[] = [
    {
      entry: entry("foo10", { mtimeMs: 1, birthtimeMs: 3, size: 2 }),
      tier: 0,
      score: { total: 100 },
    },
    {
      entry: entry("foo2", { mtimeMs: 3, birthtimeMs: 2, size: 1 }),
      tier: 2,
      score: { total: 1 },
    },
    {
      entry: entry("bar", { mtimeMs: 2, birthtimeMs: 1, size: 3 }),
      tier: 1,
      score: { total: 10 },
    },
  ];
  const expected: Record<SortMode, string> = {
    name: "bar,foo2,foo10",
    modified: "foo2,bar,foo10",
    created: "foo10,foo2,bar",
    size: "bar,foo10,foo2",
    usage: "foo10,bar,foo2",
  };
  for (const [mode, names] of Object.entries(expected) as [
    SortMode,
    string,
  ][]) {
    assert(
      [...candidates]
        .sort(compareRankedEntries(mode))
        .map(({ entry }) => entry.name)
        .join(",") === names,
      `${mode} sorting follows the selected order across different match tiers`,
    );
  }
  const sameName: RankedEntry[] = [
    {
      entry: entry("foo", { path: "/foo/baz/foo" }),
      tier: 0,
      score: { total: 1 },
    },
    {
      entry: entry("foo", { path: "/foo/bar/foo" }),
      tier: 0,
      score: { total: 1 },
    },
  ];
  assert(
    [...sameName]
      .sort(compareRankedEntries("name"))
      .map(({ entry }) => entry.path)
      .join(",") === "/foo/bar/foo,/foo/baz/foo",
    "name sorting breaks equal filenames by path",
  );
  const tiedValues: RankedEntry[] = [
    {
      entry: entry("foo", {
        path: "/foo/z/foo",
        mtimeMs: 1,
        birthtimeMs: 1,
        size: 1,
      }),
      tier: 0,
      score: { total: 1 },
    },
    {
      entry: entry("foo", {
        path: "/foo/a/foo",
        mtimeMs: 1,
        birthtimeMs: 1,
        size: 1,
      }),
      tier: 0,
      score: { total: 1 },
    },
  ];
  for (const mode of ["usage", "modified", "created", "size"] as const) {
    assert(
      [...tiedValues]
        .sort(compareRankedEntries(mode))
        .map(({ entry }) => entry.path)
        .join(",") === "/foo/a/foo,/foo/z/foo",
      `${mode} sorting breaks equal values by name and path`,
    );
  }
}
