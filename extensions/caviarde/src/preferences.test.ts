import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEOUT_MS,
  parsePhoneRegions,
  parseTimeout,
  toSettings,
} from "./preferences";

describe("parseTimeout", () => {
  it("falls back to the default on junk", () => {
    expect(parseTimeout("bientot")).toBe(DEFAULT_TIMEOUT_MS);
    expect(parseTimeout("")).toBe(DEFAULT_TIMEOUT_MS);
    expect(parseTimeout(undefined)).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("clamps absurd values instead of trusting them", () => {
    expect(parseTimeout("0")).toBe(250);
    expect(parseTimeout("-5000")).toBe(250);
    expect(parseTimeout("999999")).toBe(30_000);
  });

  it("accepts a sensible value", () => {
    expect(parseTimeout(" 2000 ")).toBe(2000);
  });
});

describe("parsePhoneRegions", () => {
  it("normalises case and whitespace", () => {
    expect(parsePhoneRegions(" fr , be ")).toEqual(["FR", "BE"]);
  });

  it("drops anything that is not a two-letter code", () => {
    expect(parsePhoneRegions("FR, FRANCE, 33, , GB")).toEqual(["FR", "GB"]);
  });

  it("deduplicates", () => {
    expect(parsePhoneRegions("FR,fr,FR")).toEqual(["FR"]);
  });

  it("returns an empty list rather than a bogus one", () => {
    expect(parsePhoneRegions("nimporte quoi")).toEqual([]);
  });
});

describe("toSettings", () => {
  it("applies the documented defaults", () => {
    const settings = toSettings({});
    expect(settings.detectorUrl).toBe("http://127.0.0.1:5002");
    expect(settings.detectorTimeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(settings.authToken).toBe("");
    expect(settings.maskPersons).toBe(true);
    expect(settings.maskLocations).toBe(true);
  });

  it("falls back to the default url when the field is blanked", () => {
    expect(toSettings({ detectorUrl: "   " }).detectorUrl).toBe(
      "http://127.0.0.1:5002",
    );
  });

  it("honours unchecked boxes", () => {
    const settings = toSettings({ maskPersons: false, maskLocations: false });
    expect(settings.maskPersons).toBe(false);
    expect(settings.maskLocations).toBe(false);
  });
});
