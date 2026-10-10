import { describe, expect, it, vi } from "vitest";
import { cityLabel, distanceKm, locationFromFix } from "./location";
import { listCountries } from "./countries";

vi.mock("@raycast/api", () => ({ LocalStorage: {} }));

describe("distanceKm", () => {
  it("measures Islamabad to Rawalpindi at about 14 km", () => {
    const km = distanceKm({ latitude: 33.6844, longitude: 73.0479 }, { latitude: 33.5651, longitude: 73.0169 });
    expect(km).toBeGreaterThan(12);
    expect(km).toBeLessThan(15);
  });

  it("is zero for the same point", () => {
    expect(distanceKm({ latitude: 24.86, longitude: 67.0 }, { latitude: 24.86, longitude: 67.0 })).toBe(0);
  });
});

describe("cityLabel", () => {
  it("skips a region equal to the city name", () => {
    expect(cityLabel({ name: "Islamabad", admin1: "Islamabad", country: "Pakistan" })).toBe("Islamabad, Pakistan");
    expect(cityLabel({ name: "Rawalpindi", admin1: "Punjab", country: "Pakistan" })).toBe(
      "Rawalpindi, Punjab, Pakistan",
    );
  });
});

describe("locationFromFix", () => {
  it("labels with locality and country, or falls back to coordinates", () => {
    const now = new Date("2026-10-08T10:00:00Z");
    expect(
      locationFromFix(
        { latitude: 33.7, longitude: 73.05, accuracy: 100, locality: "Islamabad", country: "Pakistan" },
        now,
      ),
    ).toMatchObject({ mode: "current", label: "Islamabad, Pakistan", updatedAt: now.toISOString() });
    expect(locationFromFix({ latitude: 33.7, longitude: 73.05, accuracy: 100 }, now).label).toBe("33.700, 73.050");
  });
});

describe("listCountries", () => {
  it("includes Pakistan by code with a readable name, sorted", () => {
    const countries = listCountries();
    expect(countries.find((c) => c.code === "PK")?.name).toBe("Pakistan");
    expect(countries.length).toBeGreaterThan(240);
    const names = countries.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });
});
