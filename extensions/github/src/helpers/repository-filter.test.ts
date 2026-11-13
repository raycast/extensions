import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

type RepositoryFilterModule = {
  buildOwnerSearchFilter: (owners: { userLogin?: string | null; orgLogins?: (string | null | undefined)[] }) => string;
  matchesOwnerSearchFilter: (nameWithOwner: string, searchFilter: string | null | undefined) => boolean;
};

async function loadRepositoryFilter(): Promise<RepositoryFilterModule> {
  const moduleUrl = pathToFileURL(resolve("src/helpers/repository-filter.ts")).href;
  return (await import(moduleUrl)) as RepositoryFilterModule;
}

test("builds a combined personal and organization filter", async () => {
  const { buildOwnerSearchFilter } = await loadRepositoryFilter();

  assert.equal(
    buildOwnerSearchFilter({ userLogin: "me", orgLogins: ["acme", null, "raycast"] }),
    "user:me org:acme org:raycast",
  );
  assert.equal(buildOwnerSearchFilter({ orgLogins: ["acme", "raycast"] }), "org:acme org:raycast");
  assert.equal(buildOwnerSearchFilter({ userLogin: "me" }), "user:me");
});

test("matches recent repositories against the owners in a filter", async () => {
  const { matchesOwnerSearchFilter } = await loadRepositoryFilter();
  const filter = "user:me org:acme";

  assert.equal(matchesOwnerSearchFilter("me/dotfiles", filter), true);
  assert.equal(matchesOwnerSearchFilter("Acme/website", filter), true);
  assert.equal(matchesOwnerSearchFilter("someone/me", filter), false);
  assert.equal(matchesOwnerSearchFilter("acme-labs/tool", filter), false);
  assert.equal(matchesOwnerSearchFilter("mega/tool", filter), false);
});

test("does not filter recent repositories without owner qualifiers", async () => {
  const { matchesOwnerSearchFilter } = await loadRepositoryFilter();

  assert.equal(matchesOwnerSearchFilter("anyone/anything", ""), true);
  assert.equal(matchesOwnerSearchFilter("anyone/anything", null), true);
});
