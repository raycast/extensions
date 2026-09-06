import { describe, expect, it } from "vitest";
import { DEFAULT_CITIES, addCity, buildCityCatalog, makeAnchor, parseStoredCities, removeCity } from "./cities";

describe("city catalog", () => {
  it("turns timezone identifiers into searchable city choices", () => {
    const catalog = buildCityCatalog(["America/New_York", "Europe/Warsaw", "Asia/Kolkata"]);

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "New York", timeZone: "America/New_York" }),
        expect.objectContaining({ label: "Warsaw", timeZone: "Europe/Warsaw" }),
        expect.objectContaining({ label: "Kolkata", timeZone: "Asia/Kolkata" }),
        expect.objectContaining({ label: "Mumbai", timeZone: "Asia/Kolkata" }),
        expect.objectContaining({ label: "New Delhi", timeZone: "Asia/Kolkata" }),
      ]),
    );
    expect(catalog.find((city) => city.label === "New York")?.keywords).toEqual(
      expect.arrayContaining(["NYC", "Eastern Time"]),
    );
    expect(catalog.find((city) => city.label === "New Delhi")?.keywords).toEqual(
      expect.arrayContaining(["Delhi", "India", "IST"]),
    );
  });

  it.each([
    ["Chicago", "America/Chicago"],
    ["Los Angeles", "America/Los_Angeles"],
    ["New Delhi", "Asia/Kolkata"],
  ])("preserves the searched city identity for %s", (label, timeZone) => {
    const city = buildCityCatalog([timeZone]).find((option) => option.label === label);

    expect(city).toBeDefined();
    expect(city?.timeZone).toBe(timeZone);
  });

  it("adds once, supports distinct cities in one timezone, changes the anchor, and keeps at least one city", () => {
    const tokyo = { label: "Tokyo", timeZone: "Asia/Tokyo" };
    const withTokyo = addCity(DEFAULT_CITIES, tokyo);
    const chicago = { label: "Chicago", timeZone: "America/Chicago" };
    const withChicago = addCity(withTokyo, chicago);

    expect(addCity(withTokyo, tokyo)).toEqual(withTokyo);
    expect(withChicago).toContainEqual(chicago);
    expect(makeAnchor(withChicago, tokyo)[0]).toEqual(tokyo);
    expect(removeCity([tokyo], tokyo)).toEqual([tokyo]);
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
      parseStoredCities('[{"label":"Tokyo","timeZone":"Asia/Tokyo"},{"label":"Tokyo Again","timeZone":"Asia/Tokyo"}]'),
    ).toEqual([
      { label: "Tokyo", timeZone: "Asia/Tokyo" },
      { label: "Tokyo Again", timeZone: "Asia/Tokyo" },
    ]);
    expect(
      parseStoredCities('[{"label":"Tokyo","timeZone":"Asia/Tokyo"},{"label":"TOKYO","timeZone":"Asia/Tokyo"}]'),
    ).toEqual([{ label: "Tokyo", timeZone: "Asia/Tokyo" }]);
  });
});
