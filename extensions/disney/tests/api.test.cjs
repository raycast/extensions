const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  buildCharacterUrl,
  characterWikiUrl,
  createFavouriteSaver,
  normalizeCharacters,
  parseCharacterPage,
  parseCharacterResponse,
  toggleFavourite,
} = require("../src/api.ts");

const arianna = {
  _id: 308,
  name: "Queen Arianna",
  films: ["Tangled", "Tangled: Before Ever After"],
  tvShows: ["Tangled: The Series"],
  sourceUrl: "https://disney.fandom.com/wiki/Queen_Arianna",
};

test("a single search result is displayed as one character, with missing fields handled", () => {
  const page = parseCharacterPage({ info: { count: 1, totalPages: 1 }, data: arianna }, 1);
  assert.equal(page.data.length, 1);
  assert.equal(page.data[0].name, "Queen Arianna");
  assert.deepEqual(page.data[0].shortFilms, []);
  assert.deepEqual(page.data[0].enemies, []);
  assert.equal(page.hasMore, false);
});

test("empty responses and missing pagination metadata stop loading more pages", () => {
  assert.deepEqual(parseCharacterPage({ info: { totalPages: 0 }, data: [] }, 1), { data: [], hasMore: false });
  assert.deepEqual(parseCharacterPage({ data: null }, 1), { data: [], hasMore: false });
  assert.equal(parseCharacterPage({ info: { count: 1 }, data: arianna }, 1).hasMore, false);
});

test("pagination uses info.totalPages and stops at the last page", () => {
  const payload = { info: { totalPages: 2 }, data: [arianna] };
  assert.equal(parseCharacterPage(payload, 1).hasMore, true);
  assert.equal(parseCharacterPage(payload, 2).hasMore, false);
  assert.equal(parseCharacterPage({ info: { totalPages: 3 }, data: [] }, 1).hasMore, false);
});

test("film and character filters remain encoded and present on subsequent pages", () => {
  for (const page of [1, 2, 3]) {
    const url = new URL(buildCharacterUrl({ films: "Lilo & Stitch", name: "Stitch + Angel?" }, page));
    assert.equal(url.pathname, "/character");
    assert.equal(url.searchParams.get("films"), "Lilo & Stitch");
    const nameFilter = new RegExp(url.searchParams.get("name"), "i");
    assert.equal(nameFilter.test("Stitch + Angel?"), true);
    assert.equal(nameFilter.test("Stitch Angel"), false);
    assert.equal(url.searchParams.get("page"), String(page));
    assert.equal(url.searchParams.get("pageSize"), "50");
    assert.equal([...url.searchParams].length, 4);
  }
  assert.equal(new URL(buildCharacterUrl({ tvShows: " DuckTales " }, 2)).searchParams.get("tvShows"), "DuckTales");
  assert.equal(new URL(buildCharacterUrl({ name: "  " }, 1)).searchParams.has("name"), false);
});

test("browsing Aladdin's film and TV titles still matches Aladdin and other characters", () => {
  const characters = [
    { name: "Aladdin", films: ["Aladdin (film)"], tvShows: ["Aladdin (TV series)"] },
    { name: "Jasmine", films: ["Aladdin (film)"], tvShows: ["Aladdin (TV series)"] },
    { name: "Anna", films: ["Frozen"], tvShows: [] },
  ];
  for (const [kind, title] of [
    ["films", "Aladdin (film)"],
    ["tvShows", "Aladdin (TV series)"],
  ]) {
    for (const page of [1, 2]) {
      const url = new URL(buildCharacterUrl({ [kind]: title }, page));
      const apiFilter = new RegExp(url.searchParams.get(kind), "i");
      const matches = characters.filter((character) =>
        character[kind].some((appearance) => apiFilter.test(appearance)),
      );
      assert.deepEqual(
        matches.map((character) => character.name),
        ["Aladdin", "Jasmine"],
      );
      assert.equal(apiFilter.test(title.replace(/[()]/g, "")), false);
    }
  }
});

test("names and appearance titles containing regex punctuation are matched literally", () => {
  const titles = ["A Poem Is...", "Mickey Mouse Clubhouse+", "A [B] {C} ^D$ E|F G? H* I+ J\\K"];
  for (const key of ["name", "films", "tvShows"]) {
    for (const title of titles) {
      const url = new URL(buildCharacterUrl({ [key]: title }, 1));
      const apiFilter = new RegExp("^(?:" + url.searchParams.get(key) + ")$", "i");
      assert.equal(apiFilter.test(title), true);
      assert.equal(apiFilter.test(title.replace(/[.+?*|]/g, "")), false);
    }
  }
});

test("malformed records and repeated IDs cannot crash or duplicate the list", () => {
  const data = normalizeCharacters([
    null,
    { name: "Missing ID" },
    { _id: 10, name: "" },
    arianna,
    { ...arianna, films: ["Tangled", null, 42, "", "Tangled"], allies: null },
  ]);
  assert.equal(data.length, 1);
  assert.deepEqual(data[0].films, ["Tangled"]);
  assert.deepEqual(data[0].allies, []);
});

test("service failures produce an error instead of looking like an empty search", async () => {
  await assert.rejects(parseCharacterResponse(new Response("Not found", { status: 404 })), /404/);
  assert.throws(() => parseCharacterPage({ error: "Service unavailable" }, 1), /unexpected response/);
  assert.throws(() => parseCharacterPage({ data: "Not JSON characters" }, 1), /invalid character data/);
});

test("response parsing uses the requested page even when nextPage drops filters", async () => {
  const response = new Response(
    JSON.stringify({
      info: { totalPages: 2, nextPage: "http://api.disneyapi.dev/character?page=2" },
      data: [arianna],
    }),
  );
  Object.defineProperty(response, "url", { value: buildCharacterUrl({ films: "Tangled" }, 2) });
  assert.equal((await parseCharacterResponse(response)).hasMore, false);
});

test("wiki actions use supplied links or a properly encoded wiki search", () => {
  const character = normalizeCharacters(arianna)[0];
  assert.equal(characterWikiUrl(character), arianna.sourceUrl);
  const missingSource = normalizeCharacters({
    _id: 310,
    name: "Queen Ariel & Friends",
    sourceUrl: "javascript:alert(1)",
  })[0];
  const url = new URL(characterWikiUrl(missingSource));
  assert.equal(url.hostname, "disney.fandom.com");
  assert.equal(url.pathname, "/wiki/Special:Search");
  assert.equal(url.searchParams.get("query"), "Queen Ariel & Friends");
});

test("queued favourite toggles keep every character while an earlier save is still writing", async () => {
  const ariel = { _id: 1, name: "Ariel" };
  const elsa = { _id: 2, name: "Elsa" };
  const saver = createFavouriteSaver([]);
  let stored = [];
  let releaseFirst;
  const firstWrite = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const first = saver.update(ariel, async (next) => {
    await firstWrite;
    stored = next;
  });
  const second = saver.update(elsa, async (next) => {
    stored = next;
  });
  releaseFirst();
  await first;
  await second;
  assert.deepEqual(
    stored.map((character) => character._id),
    [1, 2],
  );
});

test("a failed favourite save is discarded and the next toggle keeps its own character", async () => {
  const ariel = { _id: 1, name: "Ariel" };
  const elsa = { _id: 2, name: "Elsa" };
  const saver = createFavouriteSaver([]);
  const writes = [];
  const first = saver.update(ariel, async () => {
    throw new Error("disk full");
  });
  const second = saver.update(elsa, async (next) => {
    writes.push(next.map((character) => character._id));
  });
  await assert.rejects(first, /disk full/);
  await second;
  assert.deepEqual(writes, [[2]]);
  assert.deepEqual(
    saver.current().map((character) => character._id),
    [2],
  );
});

test("a favourite list read from storage does not replace a toggle already in progress", async () => {
  const ariel = { _id: 1, name: "Ariel" };
  const elsa = { _id: 2, name: "Elsa" };
  const saver = createFavouriteSaver();
  let release;
  const writing = new Promise((resolve) => {
    release = resolve;
  });
  const saving = saver.update(elsa, async () => {
    await writing;
  });
  await Promise.resolve();
  assert.equal(saver.initialize([ariel]), false);
  release();
  await saving;
  assert.deepEqual(
    saver.current().map((character) => character._id),
    [2],
  );
});

test("favourites retain full character data across storage and toggle by ID", () => {
  const character = normalizeCharacters(arianna)[0];
  const namesake = { ...character, _id: 309 };
  const saved = toggleFavourite(toggleFavourite([], character), namesake);
  const restored = normalizeCharacters(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  assert.deepEqual(restored[0].films, arianna.films);
  assert.equal(characterWikiUrl(restored[0]), arianna.sourceUrl);
  assert.deepEqual(toggleFavourite(restored, character), [namesake]);
});
