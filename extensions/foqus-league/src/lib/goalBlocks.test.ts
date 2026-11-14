import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planFor,
  quickStartPlan,
  strandedList,
  strandedSummary,
  withNamedCategory,
  type LearnedBlocks,
} from "./goalBlocks.ts";
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

const learnedOf = (blocks: LearnedBlocks["blocks"]): LearnedBlocks => ({ setup: null, blocks });

test("a quick start lists a category to set up only when it would drop blocks", () => {
  const { plan, need } = quickStartPlan("Break", learnedOf(known), [], true);
  assert.deepEqual(
    plan.categories.map((c) => c.id),
    ["foqus-break"],
    "the start still asks for the category, in case it exists",
  );
  assert.deepEqual(need, {
    name: "Break",
    stranded: known.Break.skipped,
    own: { id: "foqus-break", title: "Foqus Break" },
    exists: false,
    pending: false,
  });

  const imported = { Break: { ...known.Break, setUpAt: Date.now() } };
  assert.equal(
    quickStartPlan("Break", learnedOf(imported), [], true).need?.pending,
    true,
    "Raycast 2 takes the import on trust until the next start checks it",
  );
  assert.equal(
    quickStartPlan("Break", learnedOf(imported), [], false).need?.pending,
    false,
    "Raycast 1 reads its categories, so it never has to trust",
  );

  const shown = { Break: { ...known.Break, categories: [cat("foqus-break", "Foqus Break")] } };
  assert.equal(
    quickStartPlan("Break", learnedOf(shown), [], true).need?.exists,
    true,
    "a category a session has shown needs filling, not importing",
  );

  const plain = { Ship: { categories: [cat("social")], mode: "block" as const, skipped: [] } };
  assert.equal(quickStartPlan("Ship", learnedOf(plain), [], true).need, undefined, "nothing to drop");

  const allow = {
    Read: { categories: [], mode: "allow" as const, skipped: [{ id: "arxiv.org", title: "arxiv.org", app: false }] },
  };
  assert.equal(
    quickStartPlan("Read", learnedOf(allow), [], true).need,
    undefined,
    "Raycast 2 never asks an allowlist for a category it cannot check",
  );
});

test("on Raycast 1 the categories file tells a category to make from one to fill", () => {
  const partial = { id: "foqus-break", title: "Foqus Break", apps: [], websites: [], builtin: false };
  assert.equal(quickStartPlan("Break", learnedOf(known), [], false).need?.exists, false);
  assert.equal(quickStartPlan("Break", learnedOf(known), [partial], false).need?.exists, true);

  const full = { ...partial, apps: ["company.thebrowser.Browser"] };
  const { plan, need } = quickStartPlan("Break", learnedOf(known), [full], false);
  assert.equal(need, undefined, "a category that holds everything leaves nothing to set up");
  assert.deepEqual(
    plan.categories.map((c) => c.id),
    ["foqus-break"],
  );
});

test("strandedSummary names the first few and counts the rest, never the whole list", () => {
  const site = (id: string) => ({ id, title: id, app: false });
  const five = [...known.Break.skipped, site("x.com"), site("y.com"), site("z.com"), site("w.com")];
  assert.equal(strandedSummary(known.Break.skipped), "Arc");
  assert.equal(strandedSummary(five), "Arc +4");
  assert.equal(strandedSummary(five, 3), "Arc, x.com, y.com +2");
  assert.equal(strandedSummary(five.slice(0, 3), 3), "Arc, x.com, y.com");
  assert.equal(strandedSummary([]), "");
});

test("strandedList reads as a sentence: the first three, then how many more", () => {
  const site = (id: string) => ({ id, title: id, app: false });
  assert.equal(strandedList([site("x.com")]), "x.com");
  assert.equal(strandedList([site("x.com"), site("y.com")]), "x.com or y.com");
  assert.equal(strandedList(["a.com", "b.com", "c.com", "d.com", "e.com"].map(site)), "a.com, b.com, c.com, or 2 more");
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
