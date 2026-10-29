const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { before, test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadModule(file, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    URL,
    AbortSignal,
    ...globals,
    require: (id) => {
      if (id in imports) return imports[id];
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return exports;
}

const { parseWallpaperCatalog } = loadModule("wallpaper-catalog.ts");
let createWallpaperSearch;
before(async () => {
  ({ createWallpaperSearch } = loadModule("wallpaper-search.ts", {
    minisearch: require("minisearch"),
    "double-metaphone": await import("double-metaphone"),
  }));
});

const galleryArtwork = {
  id: "sea",
  slug: "the-blue-sea-monet",
  name: "The Blue Sea",
  artist: "Claude Monet",
  meta: "Claude Monet, 1882",
  thumb: "https://res.cloudinary.com/example/image/upload/w_{w}/v123/sea.jpg",
  description: "A quiet coast.",
  genre: "Landscape",
  movement: "Impressionism",
  tags: ["water"],
  searchTerms: ["blue", "sea", "calm"],
};
const html = (rows) =>
  `<html><script>unrelated()</script><script type="application/json" id="gallery-data">${JSON.stringify(rows)}</script></html>`;
const artwork = (overrides = {}) => ({
  ...parseWallpaperCatalog(html([galleryArtwork]))[0],
  ...overrides,
});
const ids = (rows) => Array.from(rows, ({ id }) => id);

test("catalog reads live JSON and maps original images and artwork links", () => {
  const rows = parseWallpaperCatalog(
    html([
      galleryArtwork,
      {
        ...galleryArtwork,
        id: "road",
        slug: "road-ring",
        artist: "Laurits Andersen Ring",
        meta: "Laurits Andersen Ring, c. 1898",
        thumb: "https://imagedelivery.net/account/image/w={w}",
      },
    ]),
  );
  assert.equal(
    rows[0].url,
    "https://res.cloudinary.com/example/image/upload/v123/sea.jpg",
  );
  assert.equal(
    rows[0].websiteUrl,
    "https://anotherboring.day/art/the-blue-sea-monet",
  );
  assert.equal(rows[0].creationDate, "1882");
  assert.equal(rows[1].url, "https://imagedelivery.net/account/image/full");
  assert.equal(rows[1].creationDate, "c. 1898");
  assert.equal(rows[0].searchTerms[0], "blue");
});

test("catalog matches the site's upcoming-artwork visibility", () => {
  const rows = parseWallpaperCatalog(
    html([
      galleryArtwork,
      { ...galleryArtwork, id: "hidden", upcoming: true },
      {
        ...galleryArtwork,
        id: "preview",
        upcoming: true,
        soundscape: "/audio/",
      },
    ]),
  );
  assert.deepEqual(ids(rows), ["sea", "preview"]);
});

test("catalog parsing tolerates script attribute order and rejects broken payloads", () => {
  const page = `<script id='gallery-data' type='application/json'>${JSON.stringify([galleryArtwork])}</script>`;
  assert.deepEqual(ids(parseWallpaperCatalog(page)), ["sea"]);
  assert.throws(
    () => parseWallpaperCatalog("<html>Unavailable</html>"),
    /unavailable/,
  );
  assert.throws(() => parseWallpaperCatalog(html({ results: [] })), /invalid/);
  assert.throws(
    () => parseWallpaperCatalog(html([{ ...galleryArtwork, thumb: null }])),
    /invalid/,
  );
  assert.throws(
    () => parseWallpaperCatalog(html([{ ...galleryArtwork, tags: [4] }])),
    /invalid/,
  );
});

test("catalog fetch reports HTTP failures instead of returning no matches", async () => {
  const { fetchWallpaperCatalog } = loadModule(
    "wallpaper-catalog.ts",
    {},
    {
      fetch: async () => ({ ok: false, status: 503 }),
    },
  );
  await assert.rejects(fetchWallpaperCatalog(), /503/);
});

test("catalog fetch reads the website's complete gallery", async () => {
  const { fetchWallpaperCatalog } = loadModule(
    "wallpaper-catalog.ts",
    {},
    {
      fetch: async (url) => {
        assert.equal(url, "https://anotherboring.day/");
        return { ok: true, text: async () => html([galleryArtwork]) };
      },
    },
  );
  assert.deepEqual(ids(await fetchWallpaperCatalog()), ["sea"]);
});

test("blank and punctuation-only queries browse every artwork", () => {
  const search = createWallpaperSearch([artwork(), artwork({ id: "other" })]);
  assert.deepEqual(ids(search("  ")), ["sea", "other"]);
  assert.deepEqual(ids(search("!!!")), ["sea", "other"]);
});

test("exact artist matches exclude mentions and similar artist names", () => {
  const search = createWallpaperSearch([
    artwork(),
    artwork({
      id: "mention",
      artist: "Edouard Manet",
      description: "Inspired by Claude Monet",
    }),
  ]);
  assert.deepEqual(ids(search("MONET")), ["sea"]);
  assert.deepEqual(ids(search("ClaudeMonet")), ["sea"]);
});

test("search ignores case and accents and supports joined artist names", () => {
  const search = createWallpaperSearch([
    artwork({ id: "cezanne", artist: "Paul Cézanne" }),
    artwork({ id: "gogh", artist: "Vincent van Gogh" }),
  ]);
  assert.deepEqual(ids(search("CEZANNE")), ["cezanne"]);
  assert.deepEqual(ids(search("vangogh")), ["gogh"]);
});

test("every query word must match across artwork fields", () => {
  const search = createWallpaperSearch([
    artwork(),
    artwork({
      id: "red",
      name: "Red Garden",
      artist: "Another Artist",
      searchTerms: ["red", "flowers"],
    }),
  ]);
  assert.deepEqual(ids(search("monet calm water")), ["sea"]);
  assert.deepEqual(ids(search("monet flowers")), []);
  assert.deepEqual(ids(search("blue impressionism")), ["sea"]);
});

test("prefixes and word endings match without Raycast title filtering", () => {
  const search = createWallpaperSearch([
    artwork({ searchTerms: ["peaceful", "mountains", "fox"] }),
  ]);
  assert.deepEqual(ids(search("peacefully mount")), ["sea"]);
  assert.deepEqual(ids(search("foxes")), ["sea"]);
});

test("typos are a fallback and never broaden successful strict matches", () => {
  const search = createWallpaperSearch([
    artwork({ id: "calm", name: "View", searchTerms: ["calm", "mountain"] }),
    artwork({ id: "palm", name: "View", searchTerms: ["palm"] }),
  ]);
  assert.deepEqual(ids(search("calm")), ["calm"]);
  assert.deepEqual(ids(search("mountian")), ["calm"]);
  assert.deepEqual(ids(search("zz")), []);
  assert.deepEqual(ids(search("nonexistent subject")), []);
});

test("phonetic artist fallback matches a differently spelled surname", () => {
  const search = createWallpaperSearch([artwork({ artist: "Paul Cézanne" })]);
  assert.deepEqual(ids(search("sesan")), ["sea"]);
});

test("catalog AI results preserve usable wallpaper fields and are cloneable", async () => {
  const tool = loadModule("tools/search-wallpapers.ts", {
    "../wallpaper-catalog": { fetchWallpaperCatalog: async () => [artwork()] },
    "../wallpaper-search": { createWallpaperSearch },
  }).default;
  const result = await tool({ query: "calm sea" });
  assert.deepEqual(ids(result), ["sea"]);
  assert.equal(result[0].url, artwork().url);
  assert.equal(result[0].websiteUrl, artwork().websiteUrl);
  assert.equal(result[0].creationDate, "1882");
  assert.equal("searchTerms" in result[0], false);
  assert.equal(structuredClone(result)[0].id, "sea");
  assert.equal((await tool({ query: "unknown wallpaper" })).length, 0);
});
