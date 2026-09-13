/**
 * Covers every configuration dimension that decides what the menus show:
 * the owner scope, watched repositories, watched teams, ignored authors and
 * the built-in / saved categories — including how they combine.
 */
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { state, api, reset } = require("./harness.cjs");
const {
  DEFAULT_IGNORED_AUTHORS,
  authorIgnoredBy,
  ensureOwnerInScope,
  isAuthorIgnored,
  loadConfig,
  normalizeAuthor,
  ownerScopeTokens,
  saveConfig,
  searchString,
  watchedRepoNames,
  watchedScopeTokens,
} = require("../src/attention/lib/config.ts");

api.Icon = {};
api.Color = {};
const { buildCategories, watchedRepos, watchedTeams } = require("../src/attention/lib/tabs.ts");

const LOGIN = "tester";
const VIEWER = { login: LOGIN, orgs: ["acme", "globex"], teams: ["acme/core", "acme/infra", "globex/web"] };

beforeEach(() => {
  reset();
});

const config = async (overrides = {}) => ({ ...(await loadConfig()), ...overrides });
const categoryQuery = (categories, id) => categories.find(c => c.id === id)?.query;

// ---------------------------------------------------------------------------
// Owner scope
// ---------------------------------------------------------------------------

test("no scope searches everywhere, and the sweep falls back to your own repositories", async () => {
  const c = await config();
  assert.deepEqual(ownerScopeTokens(c), []);
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["user:tester"]);
});

test("personal and organization owners are both scoped with user:", async () => {
  const c = await config({ activeOrgs: ["acme", "someone"] });
  assert.deepEqual(ownerScopeTokens(c), ["user:acme", "user:someone"]);
});

// ---------------------------------------------------------------------------
// Watched repositories — additive, never a replacement
// ---------------------------------------------------------------------------

test("watching a repository adds it to the organizations already in scope", async () => {
  const c = await config({
    activeOrgs: [LOGIN, "acme"],
    repos: [{ owner: "globex", name: "ui" }],
  });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["user:tester", "user:acme", "repo:globex/ui"]);
});

test("watching repositories inside an organization narrows that organization to them", async () => {
  const c = await config({ activeOrgs: ["acme", "globex"], repos: [{ owner: "globex", name: "ui" }] });
  assert.deepEqual(
    watchedScopeTokens(c, LOGIN),
    ["user:acme", "repo:globex/ui"],
    "globex is narrowed to the repository you picked; acme, untouched, stays whole",
  );
});

test("narrowing one organization never narrows another", async () => {
  const c = await config({
    activeOrgs: ["acme", "globex", "initech"],
    repos: [
      { owner: "globex", name: "ui" },
      { owner: "globex", name: "api" },
    ],
  });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), [
    "user:acme",
    "repo:globex/ui",
    "repo:globex/api",
    "user:initech",
  ]);
});

test("watching one of your own repositories narrows your account to it", async () => {
  const c = await config({ activeOrgs: [LOGIN, "acme"], repos: [{ owner: LOGIN, name: "dotfiles" }] });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["repo:tester/dotfiles", "user:acme"]);
});

test("watching a repository with no owner scope keeps your own repositories too", async () => {
  const c = await config({ repos: [{ owner: "globex", name: "ui" }] });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["user:tester", "repo:globex/ui"]);
});

test("several watched repositories all survive alongside the owners", async () => {
  const c = await config({
    activeOrgs: ["acme"],
    repos: [
      { owner: "globex", name: "ui" },
      { owner: "initech", name: "tps" },
    ],
  });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["user:acme", "repo:globex/ui", "repo:initech/tps"]);
});

test("the owner match ignores case, so GRAVL-INC and gravl-inc are one owner", async () => {
  const c = await config({ activeOrgs: ["Gravl-Inc"], repos: [{ owner: "gravl-inc", name: "ui" }] });
  assert.deepEqual(watchedScopeTokens(c, LOGIN), ["repo:gravl-inc/ui"]);
});

test("watched repositories drive the Watching category independently of the sweep", async () => {
  const c = await config({ repos: [{ owner: "acme", name: "api" }] });
  assert.deepEqual(watchedRepoNames(c), ["acme/api"]);
  assert.deepEqual(watchedRepos(c), ["acme/api"]);
  assert.equal(categoryQuery(buildCategories(c, VIEWER), "watching"), "is:pr is:open repo:acme/api");
});

test("no watched repositories means no Watching category at all", async () => {
  assert.equal(categoryQuery(buildCategories(await config(), VIEWER), "watching"), undefined);
});

// ---------------------------------------------------------------------------
// Watched teams
// ---------------------------------------------------------------------------

test("with no team chosen, every team you belong to is watched", async () => {
  assert.deepEqual(watchedTeams(await config(), VIEWER), ["acme/core", "acme/infra", "globex/web"]);
});

test("choosing teams narrows the team-review category to those", async () => {
  const c = await config({ watchTeams: ["acme/infra"] });
  assert.deepEqual(watchedTeams(c, VIEWER), ["acme/infra"]);
  assert.equal(
    categoryQuery(buildCategories(c, VIEWER), "team-review"),
    "is:pr is:open archived:false team-review-requested:acme/infra",
  );
});

test("the owner scope also limits which teams are watched", async () => {
  const c = await config({ activeOrgs: ["acme"] });
  assert.deepEqual(watchedTeams(c, VIEWER), ["acme/core", "acme/infra"], "globex/web is out of scope");
});

test("a chosen team you are not on falls back to your real teams", async () => {
  const c = await config({ watchTeams: ["acme/not-mine"] });
  assert.deepEqual(watchedTeams(c, VIEWER), ["acme/core", "acme/infra", "globex/web"]);
});

test("someone with no teams gets no team-review category", async () => {
  const categories = buildCategories(await config(), { ...VIEWER, teams: [] });
  assert.equal(categoryQuery(categories, "team-review"), undefined);
});

// ---------------------------------------------------------------------------
// Ignored authors
// ---------------------------------------------------------------------------

test("bot logins match however GitHub spells them", async () => {
  for (const spelling of ["dependabot", "dependabot[bot]", "app/dependabot", "Dependabot", "DEPENDABOT[bot]"]) {
    assert.equal(normalizeAuthor(spelling), "dependabot", `${spelling} should normalize`);
    assert.equal(authorIgnoredBy(["dependabot"], spelling), true, `${spelling} should be ignored`);
  }
});

test("the legacy dependabot account is ignored out of the box", async () => {
  assert.ok(DEFAULT_IGNORED_AUTHORS.includes("dependabot-preview"));
  assert.equal(isAuthorIgnored(await config(), "dependabot-preview[bot]"), true);
});

test("a human author is never mistaken for an ignored one", async () => {
  const c = await config();
  assert.equal(isAuthorIgnored(c, LOGIN), false);
  assert.equal(isAuthorIgnored(c, "dependabot-lookalike"), false);
});

test("an empty author is not ignored, so an unknown login still shows", async () => {
  assert.equal(authorIgnoredBy(["dependabot"], ""), false);
});

test("clearing the ignore list lets the bots back in", async () => {
  assert.equal(isAuthorIgnored(await config({ ignoredAuthors: [] }), "dependabot"), false);
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

test("the built-in categories carry the owner scope", async () => {
  const c = await config({ activeOrgs: [LOGIN, "acme"] });
  const categories = buildCategories(c, VIEWER);
  const scope = " user:tester user:acme";
  assert.equal(categoryQuery(categories, "review-requested"), `is:pr is:open review-requested:@me archived:false${scope}`);
  assert.equal(categoryQuery(categories, "my-prs"), `is:pr is:open author:@me archived:false${scope}`);
  assert.equal(categoryQuery(categories, "awaiting-reply"), `is:pr is:open involves:@me archived:false${scope}`);
});

test("turning the built-ins off leaves only your saved filters", async () => {
  const c = await config({ showBuiltins: false, filters: [{ name: "Mine", role: "author", subject: "@me" }] });
  const categories = buildCategories(c, VIEWER);
  assert.deepEqual(categories.map(x => x.id), ["filter:Mine"]);
});

test("a saved filter picks up the tracked scope, repositories included", async () => {
  const c = await config({
    defaultScope: "tracked",
    activeOrgs: ["acme"],
    repos: [{ owner: "globex", name: "ui" }],
  });
  assert.equal(
    searchString({ name: "Mine", role: "author", subject: "@me" }, c),
    "is:pr is:open author:@me user:acme repo:globex/ui",
  );
});

test("a team subject becomes the dedicated team-review qualifier", async () => {
  assert.equal(
    searchString({ name: "Team", role: "review-requested", subject: "team:acme/core" }, await config()),
    "is:pr is:open team-review-requested:acme/core",
  );
});

// ---------------------------------------------------------------------------
// Seeding your own account
// ---------------------------------------------------------------------------

test("your account joins an existing scope once and a later removal sticks", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: ["acme"] }), LOGIN);
  assert.deepEqual(seeded.activeOrgs, [LOGIN, "acme"]);

  await saveConfig({ ...seeded, activeOrgs: ["acme"] });
  const reloaded = await ensureOwnerInScope(await loadConfig(), LOGIN);
  assert.deepEqual(reloaded.activeOrgs, ["acme"]);
});

test("seeding never narrows an empty scope away from searching everywhere", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: [] }), LOGIN);
  assert.deepEqual(seeded.activeOrgs, []);
  assert.equal(seeded.ownerSeeded, true);
});

// ---------------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------------

test("a fully configured account keeps every dimension working together", async () => {
  state.preferences.owners = "ignored-legacy";
  const c = await config({
    activeOrgs: [LOGIN, "acme"],
    repos: [
      { owner: "globex", name: "ui" },
      { owner: "acme", name: "api" },
    ],
    watchTeams: ["acme/infra"],
    ignoredAuthors: ["dependabot", "renovate"],
    filters: [{ name: "Stale", raw: "is:pr is:open label:stale" }],
  });

  assert.deepEqual(
    watchedScopeTokens(c, LOGIN),
    ["user:tester", "repo:acme/api", "repo:globex/ui"],
    "acme is narrowed to its watched repository; your account, with none picked, stays whole",
  );
  assert.deepEqual(watchedTeams(c, VIEWER), ["acme/infra"]);
  assert.equal(isAuthorIgnored(c, "renovate[bot]"), true);
  assert.equal(isAuthorIgnored(c, "laurentlouk"), false);

  const categories = buildCategories(c, VIEWER);
  assert.equal(categoryQuery(categories, "watching"), "is:pr is:open repo:globex/ui repo:acme/api");
  assert.equal(categoryQuery(categories, "filter:Stale"), "is:pr is:open label:stale");
  assert.equal(categoryQuery(categories, "my-prs"), "is:pr is:open author:@me archived:false user:tester user:acme");
});
