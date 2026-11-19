import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatUptime,
  formatPort,
  phpLabel,
  serviceStateIcon,
  siteKindLabel,
  frameworkTag,
} from "../format";

describe("formatUptime", () => {
  const cases: Array<[secs: number, expected: string]> = [
    [0, "0s"],
    [59, "59s"],
    [60, "1m"],
    [90, "1m 30s"],
    [3600, "1h"],
    [90000, "25h"],
    [5943, "1h 39m"],
  ];
  for (const [secs, expected] of cases) {
    it(`${secs}s → '${expected}'`, () =>
      assert.strictEqual(formatUptime(secs), expected));
  }
});

describe("formatPort", () => {
  it("fallback → shows fallback info", () => {
    assert.strictEqual(formatPort(8080, 80, true), "8080 (fallback from 80)");
  });
  it("not fallback → just the port", () => {
    assert.strictEqual(formatPort(443, 443, false), "443");
  });
});

describe("phpLabel", () => {
  it("formats version + patch", () => {
    assert.strictEqual(phpLabel("8.5", "8.5.8"), "8.5 (8.5.8)");
  });
});

describe("serviceStateIcon", () => {
  const cases: Array<[state: string, tintColor: string]> = [
    ["running", "Green"],
    ["stopped", "SecondaryText"],
    ["starting", "Orange"],
    ["errored", "Orange"],
  ];
  for (const [state, tintColor] of cases) {
    it(`${state} → CircleFilled/${tintColor}`, () => {
      assert.deepStrictEqual(serviceStateIcon(state), {
        icon: "CircleFilled",
        tintColor,
      });
    });
  }
});

describe("siteKindLabel", () => {
  it("parked → 'Parked'", () =>
    assert.strictEqual(siteKindLabel("parked"), "Parked"));
  it("linked → 'Linked'", () =>
    assert.strictEqual(siteKindLabel("linked"), "Linked"));
});

describe("frameworkTag", () => {
  const base = {
    name: "x",
    document_root: "/tmp",
    php: "8.5",
    secure: false,
    kind: "parked" as const,
    uses_front_controller: false,
  };
  it("is_laravel → 'Laravel'", () =>
    assert.strictEqual(frameworkTag({ ...base, is_laravel: true }), "Laravel"));
  it("is_wordpress → 'WordPress'", () =>
    assert.strictEqual(
      frameworkTag({ ...base, is_wordpress: true }),
      "WordPress",
    ));
  it("both flags → 'Laravel' wins (first match)", () =>
    assert.strictEqual(
      frameworkTag({ ...base, is_laravel: true, is_wordpress: true }),
      "Laravel",
    ));
  it("neither → undefined", () =>
    assert.strictEqual(frameworkTag(base), undefined));
});
