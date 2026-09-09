const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { state, api, reset } = require("./harness.cjs");
const { loadConfig, saveConfig, searchString } = require("../src/attention/lib/config.ts");

// Run the classic menu's actual refresh path without mounting native Raycast UI.
let requests = [];
const original = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "react")
    return {
      useState: value => [value, () => {}],
      useMemo: fn => fn(),
      useEffect: () => {},
    };
  if (id === "./usePullStore")
    return {
      default: () => ({
        updatedPulls: [],
        fetchPulls: async filters => {
          requests.push(filters.join(" "));
          return [];
        },
        updatePulls: async () => {},
      }),
      __esModule: true,
    };
  return original.call(this, id, parent, isMain);
};
api.Icon = {};
api.Color = {};
const usePulls = require("../src/hooks/usePulls.tsx").default;
const { buildCategories } = require("../src/attention/lib/tabs.ts");
const viewer = { login: "tester", orgs: ["acme"], teams: [] };
beforeEach(() => {
  reset();
  requests = [];
});

async function assertScope(expected) {
  const config = await loadConfig();
  await usePulls().runPullIteration();
  assert.deepEqual(requests, [`is:open draft:false archived:false${expected}`]);
  const categories = buildCategories(config, viewer);
  assert.equal(
    categories.find(c => c.id === "review-requested").query,
    `is:pr is:open review-requested:@me archived:false${expected}`,
  );
  assert.equal(categories.find(c => c.id === "my-prs").query, `is:pr is:open author:@me archived:false${expected}`);
  assert.equal(
    categories.find(c => c.id === "awaiting-reply").query,
    `is:pr is:open involves:@me archived:false${expected}`,
  );
  assert.equal(
    searchString({ name: "Mine", role: "author", subject: "@me" }, { ...config, defaultScope: "tracked" }),
    `is:pr is:open author:@me${expected}`,
  );
}

for (const [name, owners, expected] of [
  ["personal owner", "personal-owner", " user:personal-owner"],
  ["organization", "acme", " user:acme"],
  ["mixed owners", " acme, personal-owner, ", " user:acme user:personal-owner"],
  ["no owners", "", ""],
]) {
  test(`legacy ${name} scope reaches classic, attention and saved-filter queries`, async () => {
    state.preferences.owners = owners;
    await assertScope(expected);
  });
}

test("cleared scope stays global across reloads despite a nonempty legacy preference", async () => {
  state.preferences.owners = "acme, personal-owner";
  await saveConfig({ ...(await loadConfig()), activeOrgs: [] });
  state.preferences.owners = "another-owner";
  await assertScope("");
});

test("saved scope takes precedence over legacy preferences", async () => {
  state.preferences.owners = "legacy-owner";
  await saveConfig({ ...(await loadConfig()), activeOrgs: ["chosen-owner"] });
  await assertScope(" user:chosen-owner");
});

test("older configuration without a scope inherits legacy owners", async () => {
  state.preferences.owners = "personal-owner";
  state.storage.set("gh-review.config", JSON.stringify({ showBuiltins: true }));
  await assertScope(" user:personal-owner");
});

test("explicit filter scopes and raw queries retain their meaning", async () => {
  state.preferences.owners = "personal-owner";
  const config = { ...(await loadConfig()), defaultScope: "tracked" };
  assert.equal(
    searchString({ name: "Explicit", scopes: ["org:acme", "repo:other/project"] }, config),
    "is:pr is:open org:acme repo:other/project",
  );
  assert.equal(searchString({ name: "Raw", raw: "is:pr user:someone" }, config), "is:pr user:someone");
});
