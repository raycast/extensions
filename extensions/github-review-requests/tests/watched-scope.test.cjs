const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { state, reset } = require("./harness.cjs");
const { loadConfig, saveConfig, watchedScopeTokens } = require("../src/attention/lib/config.ts");

const LOGIN = "tester";

beforeEach(() => {
  reset();
});

async function config(overrides = {}) {
  return { ...(await loadConfig()), ...overrides };
}

test("your own repositories are swept by default", async () => {
  assert.deepEqual(watchedScopeTokens(await config(), LOGIN), ["user:tester"]);
});

test("the organizations you put in scope are swept", async () => {
  const scoped = await config({ activeOrgs: ["acme", "globex"] });
  assert.deepEqual(watchedScopeTokens(scoped, LOGIN), ["user:acme", "user:globex"]);
});

test("your account is swept alongside the organizations when you add it", async () => {
  const scoped = await config({ activeOrgs: ["acme", LOGIN] });
  assert.deepEqual(watchedScopeTokens(scoped, LOGIN), ["user:acme", "user:tester"]);
});

test("watching repositories with no owner scope narrows your account and adds the rest", async () => {
  const watched = await config({
    repos: [
      { owner: "acme", name: "api" },
      { owner: LOGIN, name: "dotfiles" },
    ],
  });
  assert.deepEqual(watchedScopeTokens(watched, LOGIN), ["repo:tester/dotfiles", "repo:acme/api"]);
});

test("watched repositories outside the owner scope are still swept", async () => {
  const watched = await config({
    activeOrgs: ["acme"],
    repos: [
      { owner: "acme", name: "api" },
      { owner: "other", name: "thing" },
    ],
  });
  assert.deepEqual(watchedScopeTokens(watched, LOGIN), ["repo:acme/api", "repo:other/thing"]);
});

/**
 * The exact shape that went wrong in use: one repository watched inside one
 * organization must not drag the rest of that organization along, and must not
 * cost the other organizations either.
 */
test("watching one repo in one org leaves the other orgs whole and that org narrowed", async () => {
  const watched = await config({
    activeOrgs: ["vitoraguila", "awesome-lab", "Gravl-Inc"],
    repos: [{ owner: "Gravl-Inc", name: "gravl-ui" }],
  });
  const tokens = watchedScopeTokens(watched, "vitoraguila");

  assert.deepEqual(tokens, ["user:vitoraguila", "user:awesome-lab", "repo:Gravl-Inc/gravl-ui"]);
  assert.ok(!tokens.includes("user:Gravl-Inc"), "the whole organization must not come back in");
  assert.ok(!tokens.some(t => t.includes("gravl-backend")), "an unwatched repo of that org must stay out");
});

test("an unknown identity with no scope sweeps nothing rather than guessing", async () => {
  assert.deepEqual(watchedScopeTokens(await config(), ""), []);
});

test("the sweep survives a reload of the saved configuration", async () => {
  await saveConfig(await config({ activeOrgs: ["acme", LOGIN] }));
  assert.deepEqual(watchedScopeTokens(await loadConfig(), LOGIN), ["user:acme", "user:tester"]);
});

test("a legacy owners preference still scopes the sweep", async () => {
  state.preferences.owners = "acme";
  assert.deepEqual(watchedScopeTokens(await loadConfig(), LOGIN), ["user:acme"]);
});

test("watched repositories add to the owner scope instead of replacing it", async () => {
  const both = await config({ activeOrgs: ["acme"], repos: [{ owner: "globex", name: "ui" }] });
  assert.deepEqual(watchedScopeTokens(both, LOGIN), ["user:acme", "repo:globex/ui"]);
});

// Your own account joins the scope once, and stays out if you take it out.
const { ensureOwnerInScope } = require("../src/attention/lib/config.ts");

test("your account is added to an existing owner scope on first run", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: ["acme", "globex"] }), LOGIN);
  assert.deepEqual(seeded.activeOrgs, [LOGIN, "acme", "globex"]);
  assert.equal(seeded.ownerSeeded, true);
});

test("removing yourself afterwards sticks across launches", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: ["acme"] }), LOGIN);
  const withoutMe = { ...seeded, activeOrgs: seeded.activeOrgs.filter(o => o !== LOGIN) };
  await saveConfig(withoutMe);

  const reloaded = await ensureOwnerInScope(await loadConfig(), LOGIN);
  assert.deepEqual(reloaded.activeOrgs, ["acme"], "the seed must not undo a deliberate removal");
});

test("an empty scope is left searching everywhere rather than narrowed to you", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: [] }), LOGIN);
  assert.deepEqual(seeded.activeOrgs, [], "narrowing here would hide review requests from organizations");
  assert.equal(seeded.ownerSeeded, true);
});

test("seeding twice adds your account only once", async () => {
  const once = await ensureOwnerInScope(await config({ activeOrgs: ["acme"] }), LOGIN);
  const twice = await ensureOwnerInScope(once, LOGIN);
  assert.deepEqual(twice.activeOrgs, [LOGIN, "acme"]);
});

test("an account already in scope is not duplicated", async () => {
  const seeded = await ensureOwnerInScope(await config({ activeOrgs: ["acme", LOGIN] }), LOGIN);
  assert.deepEqual(seeded.activeOrgs, ["acme", LOGIN]);
});

test("an unknown identity seeds nothing and stays unseeded", async () => {
  const untouched = await ensureOwnerInScope(await config({ activeOrgs: ["acme"] }), "");
  assert.deepEqual(untouched.activeOrgs, ["acme"]);
  assert.ok(!untouched.ownerSeeded, "a later launch that knows the login must still get its chance");
});
