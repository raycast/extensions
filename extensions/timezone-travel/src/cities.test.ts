import { describe, expect, it } from "vitest";
import {
  DEFAULT_CITIES,
  addCity,
  buildCityCatalog,
  getCityCatalog,
  makeAnchor,
  parseStoredCities,
  removeCity,
} from "./cities";

describe("city catalog", () => {
  it("turns timezone identifiers into searchable city choices", () => {
    const catalog = buildCityCatalog(["America/New_York", "Europe/Warsaw", "Asia/Kolkata"]);

    expect(catalog.map(({ label, timeZone }) => ({ label, timeZone }))).toEqual([
      { label: "New York", timeZone: "America/New_York" },
      { label: "Warsaw", timeZone: "Europe/Warsaw" },
      { label: "Mumbai", timeZone: "Asia/Kolkata" },
    ]);
    expect(catalog[0].keywords).toEqual(expect.arrayContaining(["NYC", "Eastern Time"]));
    expect(catalog[2].keywords).toEqual(expect.arrayContaining(["Kolkata", "New Delhi", "India"]));
  });

  it("uses the runtime timezone identifier for Mumbai aliases", () => {
    const mumbai = getCityCatalog().find((city) => city.label === "Mumbai");

    expect(mumbai).toBeDefined();
    expect(mumbai?.keywords).toEqual(expect.arrayContaining(["Kolkata", "New Delhi", "India"]));
  });

  it("adds once, changes the anchor, and keeps at least one city", () => {
    const tokyo = { label: "Tokyo", timeZone: "Asia/Tokyo" };
    const withTokyo = addCity(DEFAULT_CITIES, tokyo);

    expect(addCity(withTokyo, tokyo)).toEqual(withTokyo);
    expect(makeAnchor(withTokyo, "Asia/Tokyo")[0]).toEqual(tokyo);
    expect(removeCity([tokyo], "Asia/Tokyo")).toEqual([tokyo]);
  });

  it("falls back safely when saved data is missing or malformed", () => {
    expect(parseStoredCities(undefined)).toEqual(DEFAULT_CITIES);
    expect(parseStoredCities("not json")).toEqual(DEFAULT_CITIES);
    expect(parseStoredCities("{}")).toEqual(DEFAULT_CITIES);
    expect(parseStoredCities('[{"label":"","timeZone":"Europe/Warsaw"}]')).toEqual(DEFAULT_CITIES);
    expect(parseStoredCities('[{"label":"Tokyo","timeZone":"Asia/Tokyo"}]')).toEqual([
      { label: "Tokyo", timeZone: "Asia/Tokyo" },
    ]);
    expect(
      parseStoredCities(
        '[{"label":"Tokyo","timeZone":"Asia/Tokyo"},{"label":"Tokyo Again","timeZone":"Asia/Tokyo"}]',
      ),
    ).toEqual([{ label: "Tokyo", timeZone: "Asia/Tokyo" }]);
  });
});
