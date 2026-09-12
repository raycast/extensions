import assert from "node:assert/strict";
import { parseRepos } from "../src/repos.ts";

const repo = (
  full_name: string,
  extra: Partial<{ archived: boolean; push: boolean; pushed_at: string }> = {},
) => ({
  full_name,
  description: null,
  pushed_at: extra.pushed_at ?? "2026-01-01T00:00:00Z",
  archived: extra.archived ?? false,
  permissions: { push: extra.push ?? true },
});

const page = JSON.stringify([
  repo("acme/api", { pushed_at: "2026-03-01T00:00:00Z" }),
  repo("acme/old", { archived: true }),
  repo("acme/readonly", { push: false }),
  repo("me/tool", { pushed_at: "2026-05-01T00:00:00Z" }),
]);

assert.deepEqual(
  parseRepos(page, "").map((r) => r.nameWithOwner),
  ["me/tool", "acme/api"], // newest push first; archived and read-only dropped
);
assert.deepEqual(
  parseRepos(page, "acme").map((r) => r.nameWithOwner),
  ["acme/api"],
);
assert.deepEqual(
  parseRepos(page, "ACME").map((r) => r.nameWithOwner),
  ["acme/api"], // owner match is case-insensitive
);
assert.deepEqual(parseRepos(page, "nobody"), []);
assert.deepEqual(parseRepos("", ""), []); // no output at all

// gh --paginate emits ONE merged array. If --jq is ever added back it emits one
// document per page instead, and this is the failure that produces.
assert.throws(() => parseRepos(`${page}\n${page}`, ""), /JSON/);

console.log("repos.check ok");
