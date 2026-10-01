import assert from "node:assert/strict";
import { test } from "node:test";
import { describeStranded, planFor, withNamedCategory } from "./goalBlocks.ts";
import type { FocusSetup } from "./focusSetup.ts";

const cat = (id: string, title = id) => ({ id, title });
const setup: FocusSetup = {
  categories: [cat("social", "Social"), cat("news", "News")],
  mode: "block",
  skipped: [{ id: "company.thebrowser.Browser", title: "Arc", app: true }],
  goal: "Ship",
};
const known = {
  Break: {
    categories: [],
    mode: "block" as const,
    skipped: [{ id: "company.thebrowser.Browser", title: "Arc", app: true }],
  },
};

test("a goal that has been started before keeps its own blocks", () => {
  assert.deepEqual(planFor("Break", known, setup), {
    categories: [],
    mode: "block",
    skipped: [{ id: "company.thebrowser.Browser", title: "Arc", app: true }],
    source: "goal",
  });
});

test("a goal never seen before blocks nothing, rather than borrowing the last goal's blocks", () => {
  const plan = planFor("Reading", known, setup);
  assert.equal(plan.source, "none");
  assert.deepEqual(plan.categories, []);
});

test("the goal on Raycast's start screen is read from there before it has been stored", () => {
  const plan = planFor("Ship", {}, setup);
  assert.equal(plan.source, "goal");
  assert.deepEqual(
    plan.categories.map((c) => c.id),
    ["social", "news"],
  );
});

test("with nothing learned and no setup, nothing is blocked", () => {
  assert.equal(planFor("Ship", {}, null).source, "none");
});

test("a plan keeps what the deeplink could not carry, so a category can be built for it", () => {
  assert.deepEqual(
    planFor("Ship", {}, setup).skipped.map((s) => s.title),
    ["Arc"],
  );
});

test("a goal remembers its stranded apps after the start screen moves on", () => {
  const plan = planFor("Break", known, { ...setup, goal: "Ship" });
  assert.deepEqual(
    plan.skipped.map((s) => s.title),
    ["Arc"],
  );
  assert.equal(plan.source, "goal");
});

test("allow mode survives into the plan, so the deeplink sends an allowlist", () => {
  const allow: FocusSetup = { categories: [cat("music", "Music")], mode: "allow", skipped: [], goal: "Ship" };
  assert.equal(planFor("Ship", {}, allow).mode, "allow");
});

test("a category Foqus built is used without waiting to be picked in the start screen", () => {
  const owned = { id: "foqus-break", title: "Foqus Break", apps: ["company.thebrowser.Browser"], websites: [] };
  const plan = planFor("Break", known, setup, owned);
  assert.deepEqual(
    plan.categories.map((c) => c.id),
    ["foqus-break"],
  );
  assert.deepEqual(plan.skipped, []);
});

test("an owned category leaves apps it does not hold stranded", () => {
  const owned = { id: "foqus-break", title: "Foqus Break", apps: ["com.apple.Music"], websites: [] };
  const plan = planFor("Break", known, setup, owned);
  assert.deepEqual(
    plan.skipped.map((s) => s.title),
    ["Arc"],
  );
});

test("an owned category is not added twice when it is also selected", () => {
  const owned = { id: "social", title: "Social", apps: ["company.thebrowser.Browser"], websites: [] };
  const plan = planFor("Ship", {}, setup, owned);
  assert.deepEqual(
    plan.categories.map((c) => c.id),
    ["social", "news"],
  );
});

test("on Raycast 2 a quick start asks for the category named after its goal, which Raycast cannot show us", () => {
  const plan = withNamedCategory(planFor("🚀 SiteRocket", { "🚀 SiteRocket": known.Break }, null), "🚀 SiteRocket");
  assert.deepEqual(plan.categories, [{ id: "foqus-siterocket", title: "Foqus SiteRocket" }]);
  assert.deepEqual(
    plan.skipped.map((s) => s.title),
    ["Arc"],
    "the stranded apps stay listed until a session shows the category held them",
  );
});

test("a goal with nothing stranded is started exactly as it was last run", () => {
  const plain = planFor("Ship", { Ship: { categories: [cat("social")], mode: "block", skipped: [] } }, null);
  assert.equal(withNamedCategory(plain, "Ship"), plain);
});

test("an allowlist never asks for a category that may not exist, which would leave it empty", () => {
  const allow = {
    Read: { categories: [], mode: "allow" as const, skipped: [{ id: "arxiv.org", title: "arxiv.org", app: false }] },
  };
  const plan = withNamedCategory(planFor("Read", allow, null), "Read");
  assert.deepEqual(plan.categories, [], "Raycast would drop a missing id and allow nothing at all");
});

test("the named category is not asked for twice once a session has shown it", () => {
  const shown = {
    Break: { categories: [cat("foqus-break", "Foqus Break")], mode: "block" as const, skipped: known.Break.skipped },
  };
  assert.deepEqual(
    withNamedCategory(planFor("Break", shown, null), "Break").categories.map((c) => c.id),
    ["foqus-break"],
  );
});

test("describeStranded splits apps from sites, since they are fixed differently", () => {
  const stranded = [
    { id: "com.apple.Weather", title: "Weather", app: true },
    { id: "google.com", title: "google.com", app: false },
    { id: "facebook.com", title: "facebook.com", app: false },
  ];
  assert.equal(describeStranded(stranded), "Apps: Weather\nSites: google.com, facebook.com");
});

test("describeStranded leaves out a section with nothing in it", () => {
  assert.equal(describeStranded([{ id: "x.com", title: "x.com", app: false }]), "Sites: x.com");
  assert.equal(describeStranded([{ id: "com.apple.Music", title: "Music", app: true }]), "Apps: Music");
  assert.equal(describeStranded([]), "");
});

test("a stranded website is cleared by a category that holds it, not just apps", () => {
  const withSite: FocusSetup = {
    ...setup,
    skipped: [{ id: "reddit.com", title: "reddit.com", app: false }],
  };
  const owned = { id: "foqus-ship", title: "Foqus Ship", apps: [], websites: ["reddit.com"] };
  const plan = planFor("Ship", {}, withSite, owned);
  assert.deepEqual(plan.skipped, []);
  assert.ok(plan.categories.some((c) => c.id === "foqus-ship"));
});

test("a same-titled category built for another goal is not adopted", () => {
  const owned = { id: "foqus-ship", title: "Foqus Ship", apps: ["com.apple.Music"], websites: [] };
  const plan = planFor("Break", known, setup, owned);
  assert.ok(!plan.categories.some((c) => c.id === "foqus-ship"));
  assert.deepEqual(
    plan.skipped.map((x) => x.title),
    ["Arc"],
  );
});
