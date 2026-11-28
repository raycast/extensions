import assert from "node:assert/strict";
import { test } from "node:test";
import { scanPageComplete } from "../lib/schema";
import { toCompactList, toCompactListEntry } from "./compact-media";
import {
  assertListId,
  listNameContains,
  listNameEquals,
  listNameSimilar,
  membershipEntryTypes,
  parseEpisodeKeys,
  parseSeasonKeys,
  parseTraktIds,
  resolveListItemQuery,
  summarizeLabels,
} from "./list-matching";
import { assertListAdded, readListWrite, totalCount } from "./list-write";
import { partitionByLookup } from "./title-text";

test("list names fold case and accents but keep emoji apart", () => {
  assert.equal(listNameEquals("Films Cultes", "films cultés"), true);
  assert.equal(listNameEquals("🎬 Oscars 2026", "Oscars 2026"), false);
  assert.equal(listNameSimilar("🎬 Oscars 2026", "Oscars 2026"), true);
  assert.equal(listNameEquals("日本映画", "Аниме"), false);
  assert.equal(listNameEquals("🎬", "🍿"), false);
  assert.equal(listNameContains("🎬 Oscars 2026", "oscars"), true);
  assert.equal(listNameContains("Oscars 2026", ""), false);
});

test("a season membership check never counts an episode of that season", () => {
  const season = resolveListItemQuery("Severance season 2");
  assert.deepEqual(membershipEntryTypes(undefined, season.seasonNumber, season.episodeNumber), ["season"]);

  const episode = resolveListItemQuery("Severance S02E03");
  assert.deepEqual(membershipEntryTypes(undefined, episode.seasonNumber, episode.episodeNumber), ["episode"]);

  assert.deepEqual(membershipEntryTypes(undefined), ["movie", "show"]);
  assert.deepEqual(membershipEntryTypes("episodes", 2), ["episode"]);
});

test("list IDs must be a numeric ID or a slug", () => {
  assert.equal(assertListId("oscars-2026"), "oscars-2026");
  assert.equal(assertListId(30481001), "30481001");
  assert.throws(() => assertListId("../watchlist"));
  assert.throws(() => assertListId("oscars 2026"));
  assert.throws(() => assertListId(""));
});

test("ID batches report typos instead of dropping them", () => {
  assert.deepEqual(parseTraktIds("329862, 16662;329862"), { ids: [329862, 16662], invalid: [] });
  assert.deepEqual(parseTraktIds("329862,abc,1.5,-3"), { ids: [329862], invalid: ["abc", "1.5", "-3"] });
});

test("season and episode keys are show-relative", () => {
  assert.deepEqual(parseSeasonKeys("154784:1, 154784:0,154784:1"), {
    keys: [
      { showTraktId: 154784, seasonNumber: 1 },
      { showTraktId: 154784, seasonNumber: 0 },
    ],
    invalid: [],
  });
  assert.deepEqual(parseSeasonKeys("88").invalid, ["88"]);
  assert.deepEqual(parseEpisodeKeys("154784:1:3").keys, [{ showTraktId: 154784, seasonNumber: 1, episodeNumber: 3 }]);
  assert.deepEqual(parseEpisodeKeys("154784:1:0,154784:1").invalid, ["154784:1:0", "154784:1"]);
});

test("a 201 with every count at 0 is not a list write", () => {
  const empty = readListWrite({
    added: { movies: 0, shows: 0, seasons: 0, episodes: 0 },
    existing: { movies: 0, shows: 0, seasons: 0, episodes: 0 },
    not_found: { movies: [], shows: [], seasons: [], episodes: [] },
  });
  assert.throws(() => assertListAdded(empty, "Oscars"));

  const unmatched = readListWrite({ added: { movies: 0 }, not_found: { movies: [{ ids: { trakt: 1 } }] } });
  assert.throws(() => assertListAdded(unmatched, "Oscars"), /matched none/);

  const alreadyThere = readListWrite({ added: { movies: 0 }, existing: { movies: 1 }, list: { item_count: 7 } });
  assert.doesNotThrow(() => assertListAdded(alreadyThere, "Oscars"));
  assert.equal(alreadyThere.listItemCount, 7);

  assert.throws(() => assertListAdded(readListWrite(undefined), "Oscars"), /did not confirm/);
});

test("list write counts cover seasons and episodes", () => {
  const result = readListWrite({ added: { movies: 1, seasons: 2, episodes: 3 }, deleted: { shows: 1 } });
  assert.equal(totalCount(result.added), 6);
  assert.equal(totalCount(result.deleted), 1);
});

test("a list scan stops on the served page size, not the requested one", () => {
  const clamped = {
    "x-pagination-page": 1,
    "x-pagination-limit": 100,
    "x-pagination-page-count": 3,
    "x-pagination-item-count": 260,
  };
  assert.equal(scanPageComplete(100, clamped, 250), false);
  assert.equal(scanPageComplete(60, { ...clamped, "x-pagination-page": 3 }, 250), true);
});

test("compact list uses the slug as listId, falling back to the numeric ID", () => {
  assert.equal(toCompactList({ name: "A", ids: { trakt: 5, slug: "a" } }).listId, "a");
  assert.equal(toCompactList({ name: "A", ids: { trakt: 5, slug: null } }).listId, "5");
});

test("season and episode entries carry the show needed to remove them", () => {
  const show = { title: "Severance", year: 2022, ids: { trakt: 154784 } };
  const season = toCompactListEntry({ id: 1, type: "season", show, season: { number: 2, ids: { trakt: 88 } } });
  assert.equal(season.showTraktId, 154784);
  assert.equal(season.seasonNumber, 2);
  assert.equal(season.year, 2022);

  const episode = toCompactListEntry({
    id: 2,
    type: "episode",
    show,
    episode: { season: 1, number: 3, title: "In Perpetuity", ids: { trakt: 99 } },
  });
  assert.equal(episode.episodeLabel, "S01E03");
  assert.equal(episode.showTraktId, 154784);
  assert.equal(episode.traktId, 99);
});

test("list membership keeps a sequel out of an exact title hit", () => {
  const entries = [
    { title: "Dune", year: 2021, traktId: 1 },
    { title: "Dune: Part Two", year: 2024, traktId: 2 },
  ];
  const pick = partitionByLookup(
    entries,
    (e) => e.title,
    (e) => e.traktId,
    (e) => e.year,
    "Dune 1984",
  );
  assert.deepEqual(pick.exact, []);
  assert.deepEqual(
    pick.yearHeldBy.map((e) => e.traktId),
    [1],
  );
});

test("membership queries parse season and episode numbers off the title", () => {
  assert.deepEqual(resolveListItemQuery("Severance season 2"), {
    text: "Severance",
    seasonNumber: 2,
    episodeNumber: undefined,
  });
  assert.deepEqual(resolveListItemQuery("Severance S01E03"), {
    text: "Severance",
    seasonNumber: 1,
    episodeNumber: 3,
  });
  assert.deepEqual(resolveListItemQuery("Severance season 2", 9), {
    text: "Severance",
    seasonNumber: 9,
    episodeNumber: undefined,
  });
  assert.deepEqual(resolveListItemQuery("Severance"), {
    text: "Severance",
    seasonNumber: undefined,
    episodeNumber: undefined,
  });
});

test("list confirmations name every resolved title", () => {
  const labels = ["A", "B", "C", "D", "E", "F"];
  assert.equal(summarizeLabels(labels), "A, B, C, D, E, F");
});

test("season entries match by show title plus season number labels", () => {
  const show = { title: "Severance", year: 2022, ids: { trakt: 154784 } };
  const entries = [
    { id: 1, type: "season" as const, show, season: { number: 1, ids: { trakt: 88 } } },
    { id: 2, type: "season" as const, show, season: { number: 2, ids: { trakt: 89 } } },
  ];
  const titlesOf = (entry: (typeof entries)[number]) => {
    const n = entry.season.number;
    return [entry.show.title, `${entry.show.title} Season ${n}`, `${entry.show.title} (Season ${n})`];
  };
  const season2 = entries.filter((entry) => entry.season.number === 2);
  const pick = partitionByLookup(
    season2,
    titlesOf,
    (entry) => entry.season.ids.trakt,
    (entry) => entry.show.year,
    "Severance",
  );
  assert.deepEqual(
    pick.exact.map((entry) => entry.season.number),
    [2],
  );
});
