import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeUrl, toOptions } from "../src/lib/options";

describe("toOptions", () => {
  it("applies defaults when only the link is set", () => {
    assert.deepEqual(toOptions({ icsUrl: "" }), {
      weeks: 2,
      startHour: 8,
      endHour: 18,
      minSlotMinutes: 30,
      tentativeIsBusy: true,
      includeWeekend: false,
      language: "en",
    });
  });

  it("parses valid values", () => {
    const o = toOptions({
      icsUrl: "",
      weeks: "4",
      startHour: "7",
      endHour: "20",
      minSlotMinutes: "45",
      tentativeIsBusy: false,
      includeWeekend: true,
      language: "de",
    });
    assert.deepEqual(o, {
      weeks: 4,
      startHour: 7,
      endHour: 20,
      minSlotMinutes: 45,
      tentativeIsBusy: false,
      includeWeekend: true,
      language: "de",
    });
  });

  it("falls back to defaults for non-numeric input", () => {
    const o = toOptions({ icsUrl: "", weeks: "many", startHour: "", endHour: "late", minSlotMinutes: "x" });
    assert.equal(o.weeks, 2);
    assert.equal(o.startHour, 8);
    assert.equal(o.endHour, 18);
    assert.equal(o.minSlotMinutes, 30);
  });

  it("clamps values to the supported range", () => {
    const o = toOptions({ icsUrl: "", weeks: "99", startHour: "-3", endHour: "30", minSlotMinutes: "1" });
    assert.equal(o.weeks, 4);
    assert.equal(o.startHour, 0);
    assert.equal(o.endHour, 24);
    assert.equal(o.minSlotMinutes, 5);
  });

  it("keeps the end hour after the start hour", () => {
    assert.equal(toOptions({ icsUrl: "", startHour: "14", endHour: "9" }).endHour, 15);
    assert.equal(toOptions({ icsUrl: "", startHour: "10", endHour: "10" }).endHour, 11);
  });

  it("accepts hours with trailing text", () => {
    assert.equal(toOptions({ icsUrl: "", startHour: "9:30" }).startHour, 9);
  });

  it("uses English for unknown languages", () => {
    assert.equal(toOptions({ icsUrl: "", language: "fr" }).language, "en");
  });
});

describe("normalizeUrl", () => {
  it("keeps https links", () => {
    assert.equal(normalizeUrl("https://example.com/cal.ics"), "https://example.com/cal.ics");
  });

  it("rewrites webcal and webcals to https", () => {
    assert.equal(normalizeUrl("webcal://example.com/cal.ics"), "https://example.com/cal.ics");
    assert.equal(normalizeUrl("WEBCALS://example.com/cal.ics"), "https://example.com/cal.ics");
  });

  it("trims whitespace", () => {
    assert.equal(normalizeUrl("  https://example.com/cal.ics\n"), "https://example.com/cal.ics");
  });

  it("rejects everything else", () => {
    assert.throws(() => normalizeUrl("http://example.com/cal.ics"), /https:\/\/ or webcal:\/\//);
    assert.throws(() => normalizeUrl("example.com/cal.ics"));
    assert.throws(() => normalizeUrl(""));
    assert.throws(() => normalizeUrl("file:///etc/passwd"));
  });
});
