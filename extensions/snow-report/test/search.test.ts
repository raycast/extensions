import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIndex, searchResorts } from "../src/lib/search";
import type { Resort } from "../src/types";

const resort = (name: string, country = "France", region = ""): Resort => ({
  id: name,
  name,
  country,
  region,
  lat: 0,
  lon: 0,
});

const index = buildIndex([
  resort("Brévent/Flégère (Chamonix)", "France", "Haute-Savoie"),
  resort("Les Grands Montets", "France", "Haute-Savoie"),
  resort("Whistler Blackcomb", "Canada", "British Columbia"),
  resort("Big White", "Canada", "British Columbia"),
]);
const names = (query: string) => searchResorts(index, query).map((r) => r.name);

test("ignores accents and case", () => {
  assert.deepEqual(names("FLEGERE"), ["Brévent/Flégère (Chamonix)"]);
});

test("every term has to match name, country or region", () => {
  assert.deepEqual(names("canada white"), ["Big White"]);
  assert.deepEqual(names("haute savoie montets"), ["Les Grands Montets"]);
});

test("name matches rank above region and country matches", () => {
  const index2 = buildIndex([resort("Somewhere", "Canada", "Whistler Valley"), resort("Whistler Blackcomb", "Canada")]);
  assert.deepEqual(
    searchResorts(index2, "whistler").map((r) => r.name),
    ["Whistler Blackcomb", "Somewhere"],
  );
});

test("an empty query returns nothing, and results stop at 50", () => {
  assert.deepEqual(names("   "), []);
  const many = buildIndex(Array.from({ length: 80 }, (_, i) => resort(`Peak ${i}`)));
  assert.equal(searchResorts(many, "peak").length, 50);
});
