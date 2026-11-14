// Live tests: they call the real keyless Scento Perfume API and check the mapping the extension relies on.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NotFoundError,
  getFamily,
  getMaterial,
  getNeighbours,
  getPortrait,
  listFamilies,
  searchNotes,
  searchPerfumes,
} from "../src/lib/api";
import { materialMarkdown, portraitMarkdown } from "../src/lib/markdown";

const isUrl = (s: string) => /^https:\/\/www\.scento\.com\//.test(s);

test("search maps matches and paginates with the continuation value", async () => {
  const first = await searchPerfumes("santal");
  assert.ok(first.total > 10);
  assert.equal(first.items.length, 10);
  for (const p of first.items) {
    assert.ok(p.name && p.house, "name and house present");
    assert.ok(isUrl(p.page), `scento.com page url: ${p.page}`);
  }
  assert.ok(first.cursor, "continuation present");
  const second = await searchPerfumes("santal", first.cursor ?? undefined);
  assert.equal(second.items.length, 10);
  assert.notEqual(second.items[0].name + second.items[0].house, first.items[0].name + first.items[0].house);
});

test("portrait maps notes, family and page for a known perfume", async () => {
  const p = await getPortrait({ name: "Santal 33", house: "Le Labo" });
  assert.equal(p.name, "Santal 33");
  assert.equal(p.family, "Wood & Root");
  assert.ok(p.notes.includes("Sandalwood"));
  assert.equal(p.url, "https://www.scento.com/perfumes/santal-33-le-labo");
  assert.match(portraitMarkdown(p), /# Santal 33/);
});

test("portrait maps a pyramid when the perfume has one", async () => {
  const p = await getPortrait({ name: "Baccarat Rouge 540", house: "Maison Francis Kurkdjian" });
  assert.ok(p.pyramid);
  assert.ok(p.pyramid?.top.includes("Jasmine"));
  assert.match(portraitMarkdown(p), /\*\*Top:\*\* Jasmine, Saffron/);
});

test("every search result of a query resolves to a portrait", async () => {
  const { items } = await searchPerfumes("rose");
  for (const item of items.slice(0, 5)) {
    const p = await getPortrait(item);
    assert.equal(p.name, item.name, `${item.name} ${item.house}`);
    assert.ok(isUrl(p.url));
  }
});

test("neighbours map shared notes and differences", async () => {
  const res = await getNeighbours({ name: "Santal 33", house: "Le Labo" });
  assert.ok(res.total > 10);
  assert.ok(res.items.length > 0);
  const n = res.items[0];
  assert.ok(n.shared.length > 0);
  assert.ok(isUrl(n.page));
});

test("families list maps counts and the detail maps exemplars", async () => {
  const families = await listFamilies();
  assert.equal(families.length, 14);
  assert.ok(families.every((f) => f.id && f.name && f.perfumeCount > 0));
  const wood = await getFamily("wood-root");
  assert.equal(wood.name, "Wood & Root");
  assert.ok(wood.exemplars.length > 0);
  assert.ok(wood.exemplars.every((e) => isUrl(e.page)));
});

test("note search and material portrait map", async () => {
  const hits = await searchNotes("rose");
  assert.ok(hits.some((m) => m.name === "Rose"));
  const rose = await getMaterial("Rose");
  assert.equal(rose.name, "Rose");
  assert.ok(rose.smellsLike);
  assert.ok(rose.showcasedIn.length > 0);
  assert.equal(rose.url, "https://www.scento.com/note/rose");
  assert.match(materialMarkdown(rose), /Showcased in/);
  assert.match(materialMarkdown(rose), new RegExp(`## Smells like\\n\\n${rose.smellsLike}`));
});

test("material markdown adds a Smells like section only when present", () => {
  const base = {
    name: "Test",
    aliases: [],
    naturalOrSynthetic: null,
    origin: null,
    smellsLike: null,
    family: null,
    scentoFamily: null,
    pairsWellWith: [],
    showcasedIn: [],
    lede: "A lede.",
    url: "https://www.scento.com/note/test",
  };
  assert.doesNotMatch(materialMarkdown(base), /Smells like/);
  assert.match(materialMarkdown({ ...base, smellsLike: "Warm amber." }), /## Smells like\n\nWarm amber\./);
});

test("unknown perfume and note raise NotFoundError", async () => {
  await assert.rejects(getPortrait({ name: "nonexistentxyz", house: "" }), NotFoundError);
  await assert.rejects(getMaterial("zzzz"), NotFoundError);
});

test("an empty query is rejected by the API with its message", async () => {
  await assert.rejects(searchPerfumes(""), /"q" is required/);
});
