import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { MatchDayLeague } from "../src/fotmob.ts";
import type { Favorites } from "../src/store.ts";
import { buildSections, isFavoriteMatch, statusOf } from "../src/schedule.ts";

const leagues: MatchDayLeague[] = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "fixtures/matches-20260910.json"),
    "utf8",
  ),
).leagues;

const NO_FAVS: Favorites = { teams: [], leagues: [] };
const total = (sections: { matches: unknown[] }[]) =>
  sections.reduce((n, s) => n + s.matches.length, 0);

test("all mode: every league and match, no favorites section", () => {
  const sections = buildSections(leagues, NO_FAVS, "all");
  assert.equal(sections.length, 41);
  assert.equal(total(sections), 80);
  assert.ok(
    !sections.some((s) => s.key === "teams" || s.title.startsWith("★")),
  );
});

test("Champions League sorts first", () => {
  assert.equal(
    buildSections(leagues, NO_FAVS, "all")[0].title,
    "Champions League",
  );
});

test("favorite team 9823 yields one ★ Teams match", () => {
  const favs: Favorites = {
    teams: [{ id: 9823, name: "Bayern" }],
    leagues: [],
  };
  const sections = buildSections(leagues, favs, "all");
  assert.equal(sections[0].key, "teams");
  assert.equal(sections[0].title, "★ Teams");
  assert.equal(sections[0].matches.length, 1);
  const { match, league } = sections[0].matches[0];
  assert.ok(match.home.id === 9823 || match.away.id === 9823);
  assert.ok(isFavoriteMatch(match, league, favs));
  // still listed in its own league section, and totals are unchanged
  assert.equal(sections.length, 42);
  assert.equal(total(sections.slice(1)), 80);
  assert.equal(total(buildSections(leagues, favs, "favorites")), 1);
});

test("favorite league 42 matches through primaryId, not the day id", () => {
  const favs: Favorites = {
    teams: [],
    leagues: [{ id: 42, name: "Champions League" }],
  };
  const sections = buildSections(leagues, favs, "all");
  assert.equal(sections[0].title, "★ Champions League");
  assert.equal(sections[0].matches.length, 6);
  assert.ok(sections[0].matches.every((p) => p.league.primaryId === 42));
  // pinned, not duplicated
  assert.equal(sections.length, 41);
  assert.equal(total(sections), 80);
  const favMode = buildSections(leagues, favs, "favorites");
  assert.equal(favMode.length, 1);
  assert.equal(favMode[0].title, "★ Champions League");
  assert.equal(favMode[0].matches.length, 6);
});

test("teams before leagues, ★ Teams sorted by kickoff", () => {
  const favs: Favorites = {
    teams: [{ id: 9823, name: "Bayern" }],
    leagues: [{ id: 42, name: "Champions League" }],
  };
  const sections = buildSections(leagues, favs, "favorites");
  assert.deepEqual(
    sections.map((s) => s.title),
    ["★ Teams", "★ Champions League"],
  );
  const times = sections[0].matches.map((p) => p.match.timeTS);
  assert.deepEqual(
    times,
    [...times].sort((a, b) => a - b),
  );
});

test("statusOf", () => {
  const byId = new Map(leagues.flatMap((l) => l.matches).map((m) => [m.id, m]));
  const state = (id: number) => statusOf(byId.get(id)!);
  assert.equal(state(6106331), "live");
  assert.equal(state(6019466), "finished");
  assert.equal(state(6106048), "cancelled");
  assert.equal(state(6106240), "scheduled");
});
