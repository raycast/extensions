import {
  matchPath,
  matchesStats,
  parseQuery,
  TypeFilter,
} from "../src/lib/query";
import { createRecentValidator } from "../src/lib/recent-validation";
import { Entry } from "../src/lib/types";

export async function typeFilterChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const folder: Entry = {
    path: "/foo/bar",
    name: "bar",
    isDirectory: true,
    isSymlink: false,
    size: 0,
    mtimeMs: 0,
    birthtimeMs: 0,
  };
  const file: Entry = {
    ...folder,
    path: "/foo/bar.txt",
    name: "bar.txt",
    isDirectory: false,
  };
  for (const [type, wanted] of [
    ["all", 2],
    ["directory", 1],
    ["file", 1],
  ] as const) {
    const parsed = parseQuery("bar", type);
    const found = [folder, file].filter(
      (entry) =>
        matchPath(parsed, entry.path, entry.isDirectory) !== undefined &&
        matchesStats(parsed, entry),
    );
    assert(
      found.length === wanted &&
        (type === "all" || found[0].isDirectory === (type === "directory")),
      `${type} dropdown filter restricts matching results`,
    );
    assert(
      parsed.normalized === "bar" && parsed.tokens.join() === "bar",
      `${type} filter preserves search terms and learned-query keys`,
    );
  }
  for (const [text, fallback, wanted] of [
    ["-d bar", "file", "directory"],
    ["bar -f", "directory", "file"],
    [":folder bar", "file", "directory"],
    ["^file bar", "directory", "file"],
    ["-d -f bar", "directory", "file"],
    ["- bar", "directory", "directory"],
  ] as [string, TypeFilter, TypeFilter][]) {
    assert(
      parseQuery(text, fallback).type === wanted,
      `query ${text} respects directive precedence`,
    );
  }
  assert(
    !matchesStats(parseQuery("", "directory"), file) &&
      !matchesStats(parseQuery("", "file"), folder),
    "type filtering also protects path-bar and learned matches that bypass text matching",
  );
  const candidates = Array.from({ length: 510 }, (_, i) => ({
    ...file,
    path: `/foo/bar${i}.txt`,
  }));
  candidates.push(folder);
  const byPath = new Map(
    [...candidates, file].map((entry) => [entry.path, entry]),
  );
  const validate = createRecentValidator(async (full) => byPath.get(full));
  const filtered = await validate(candidates, {
    typeFilter: "directory",
    limit: 1,
    continuous: true,
  });
  assert(
    filtered.entries.length === 1 && filtered.entries[0].path === "/foo/bar",
    "cached type filtering happens before the result cap, not after a file-only shortlist",
  );
  const overridden = await validate([folder, file], {
    query: "-f",
    typeFilter: "directory",
    continuous: true,
  });
  assert(
    overridden.entries.length === 1 && !overridden.entries[0].isDirectory,
    "cached validation respects explicit query directives over the dropdown",
  );
}
