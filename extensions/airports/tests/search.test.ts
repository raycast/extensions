import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAirportIndex, searchAirports, type Airport } from "../src/search.ts";

const { airports }: { airports: Airport[] } = JSON.parse(
  readFileSync(new URL("../assets/airports.json", import.meta.url), "utf8"),
);
const index = createAirportIndex(airports);

// Exercise the shipped data, not a separate fixture that can drift from it.
test("IATA lookup is case-insensitive and ranks the exact code first", () => {
  const [airport] = searchAirports(index, "  lHr  ");
  assert.equal(airport.iata, "LHR");
  assert.match(airport.name, /Heathrow/);
});

test("airport names resolve back to their IATA codes", () => {
  assert.equal(searchAirports(index, "John F. Kennedy")[0].iata, "JFK");
  assert.equal(searchAirports(index, "Frankfurt Main")[0].iata, "FRA");
  assert.equal(searchAirports(index, "Charles de Gaulle")[0].iata, "CDG");
});

test("accented aliases and punctuation match without accents", () => {
  for (const query of ["München", "munchen", "Franz Josef Strauß", "franz josef strauss"]) {
    assert.ok(
      searchAirports(index, query).some(({ iata }) => iata === "MUC"),
      query,
    );
  }
});

test("multi-word city and country queries require every token in any order", () => {
  const matches = searchAirports(index, "francisco united states");
  assert.ok(matches.some(({ iata }) => iata === "SFO"));
  assert.ok(matches.every(({ countryCode }) => countryCode === "US"));
  assert.deepEqual(searchAirports(index, "states francisco united"), matches);
  assert.deepEqual(searchAirports(index, "heathrow germany"), []);
});

test("blank search exposes the whole bundle; unknown searches are empty", () => {
  assert.deepEqual(searchAirports(index, "   "), airports);
  assert.deepEqual(searchAirports(index, "no-such-airport-987654321"), []);
});

test("ICAO lookup also resolves its airport", () => {
  assert.equal(searchAirports(index, "KJFK")[0].iata, "JFK");
});
