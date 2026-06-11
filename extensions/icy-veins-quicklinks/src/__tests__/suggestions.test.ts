import { describe, it, expect } from "vitest";
import { getSuggestions } from "../utils/suggestions";
import type { Suggestion } from "../types";

const BASE = "https://www.icy-veins.com/wow";

// ---------------------------------------------------------------------------
// Empty query — 74 items (34 non-tank specs × 2 modes + 6 tank specs × 1 mode, guide page each)
// ---------------------------------------------------------------------------

describe("getSuggestions()", () => {
  it("empty string returns 74 suggestions (34 non-tank specs × 2 modes + 6 tank specs × 1 mode)", () => {
    expect(getSuggestions("").length).toBe(74);
  });

  it("whitespace-only query returns 74 suggestions", () => {
    expect(getSuggestions("   ").length).toBe(74);
  });

  it("each suggestion has a unique id", () => {
    const ids = getSuggestions("").map((s: Suggestion) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each suggestion has an icon URL pointing to a local asset", () => {
    for (const s of getSuggestions("")) {
      expect(s.icon).toMatch(/^icons\/.+\.jpg$/);
    }
  });

  it("each suggestion url starts with https://www.icy-veins.com/wow/", () => {
    for (const s of getSuggestions("")) {
      expect(s.url).toMatch(/^https:\/\/www\.icy-veins\.com\/wow\//);
    }
  });

  it("empty-query suggestions point to guide/intro pages only", () => {
    for (const s of getSuggestions("")) {
      expect(s.url).toMatch(/-(guide|pvp-guide)$/);
    }
  });

  // ---------------------------------------------------------------------------
  // Spec matching
  // ---------------------------------------------------------------------------

  it('"sp" returns suggestions only for shadow-priest', () => {
    const results = getSuggestions("sp");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
    }
  });

  it('"sp" returns 20 suggestions (10 pve pages + 1 resources pve + 8 pvp pages + 1 resources pvp)', () => {
    expect(getSuggestions("sp").length).toBe(20);
  });

  it('"sp" results have unique ids', () => {
    const ids = getSuggestions("sp").map((s: Suggestion) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('"shadow priest" returns same spec as "sp"', () => {
    const spIds = getSuggestions("sp")
      .map((s: Suggestion) => s.id)
      .sort();
    const shadowIds = getSuggestions("shadow priest")
      .map((s: Suggestion) => s.id)
      .sort();
    expect(shadowIds).toEqual(spIds);
  });

  it('"SP" (uppercase) returns same as "sp"', () => {
    const lower = getSuggestions("sp")
      .map((s: Suggestion) => s.id)
      .sort();
    const upper = getSuggestions("SP")
      .map((s: Suggestion) => s.id)
      .sort();
    expect(upper).toEqual(lower);
  });

  it('"bdk" returns suggestions only for blood-death-knight', () => {
    const results = getSuggestions("bdk");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("blood-death-knight");
    }
  });

  it('"bdk" triggers exact alias match (Phase A) returning all PVE pages (tank spec, no PVP)', () => {
    expect(getSuggestions("bdk").length).toBe(11);
  });

  it('"blood dk" returns suggestions only for blood-death-knight', () => {
    const results = getSuggestions("blood dk");
    expect(
      results.every((s: Suggestion) => s.specSlug === "blood-death-knight"),
    ).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Mode filtering
  // ---------------------------------------------------------------------------

  it('"sp pve" returns only pve suggestions for shadow-priest', () => {
    const results = getSuggestions("sp pve");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
      expect(s.mode).toBe("pve");
    }
  });

  it('"sp pvp" returns only pvp suggestions for shadow-priest', () => {
    const results = getSuggestions("sp pvp");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
      expect(s.mode).toBe("pvp");
    }
  });

  it('"sp pve" results all have mode="pve"', () => {
    for (const s of getSuggestions("sp pve")) {
      expect(s.mode).toBe("pve");
    }
  });

  it('"sp pvp" results all have mode="pvp"', () => {
    for (const s of getSuggestions("sp pvp")) {
      expect(s.mode).toBe("pvp");
    }
  });

  it('"sp pve" returns 11 suggestions (10 pve pages + 1 resources)', () => {
    expect(getSuggestions("sp pve").length).toBe(11);
  });

  it('"sp pvp" returns 9 suggestions (8 pvp pages + 1 resources)', () => {
    expect(getSuggestions("sp pvp").length).toBe(9);
  });

  // ---------------------------------------------------------------------------
  // Page filtering
  // ---------------------------------------------------------------------------

  it('"sp pve g" returns pve pages for shadow-priest whose aliases start with "g" (guide, gear, gems, glossary)', () => {
    // PVE pages where at least one alias begins with "g":
    //   guide                     → alias "guide"
    //   gems-enchants-consumables → alias "gems"
    //   gear-best-in-slot         → alias "gear"
    //   spell-summary             → alias "glossary"
    const results = getSuggestions("sp pve g");
    expect(results).toHaveLength(4);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
      expect(s.mode).toBe("pve");
    }
    const urls = results.map((s: Suggestion) => s.url);
    expect(urls.some((u) => u.includes("shadow-priest-pve-dps-guide"))).toBe(
      true,
    );
    expect(urls.some((u) => u.includes("gear-best-in-slot"))).toBe(true);
    expect(urls.some((u) => u.includes("gems-enchants-consumables"))).toBe(
      true,
    );
    expect(urls.some((u) => u.includes("spell-summary"))).toBe(true);
  });

  it('"sp pve gear" returns exactly 1 suggestion — the gear page', () => {
    const results = getSuggestions("sp pve gear");
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(
      `${BASE}/shadow-priest-pve-dps-gear-best-in-slot`,
    );
  });

  it('"sp pvp b" returns pvp pages for shadow-priest whose aliases start with "b" (bg, battleground, blitz, build, bis)', () => {
    // PVP pages where at least one alias begins with "b":
    //   pvp-talents-and-builds              → alias "build"
    //   pvp-stat-priority-gear-and-trinkets → alias "bis"
    //   battleground-blitz-pvp-guide        → aliases "bg", "battleground", "blitz"
    const results = getSuggestions("sp pvp b");
    expect(results).toHaveLength(3);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
      expect(s.mode).toBe("pvp");
    }
    const urls = results.map((s: Suggestion) => s.url);
    expect(urls.some((u) => u.includes("pvp-talents-and-builds"))).toBe(true);
    expect(urls.some((u) => u.includes("battleground-blitz-pvp-guide"))).toBe(
      true,
    );
    expect(
      urls.some((u) => u.includes("pvp-stat-priority-gear-and-trinkets")),
    ).toBe(true);
  });

  it('"sp pvp gear" returns exactly 1 pvp gear suggestion', () => {
    const results = getSuggestions("sp pvp gear");
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(
      `${BASE}/shadow-priest-pvp-stat-priority-gear-and-trinkets`,
    );
  });

  it('"sp pve lev" returns exactly 1 leveling-guide suggestion', () => {
    const results = getSuggestions("sp pve lev");
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(`${BASE}/shadow-priest-leveling-guide`);
  });

  it('"sp resources" (no mode token) returns 2 suggestions — one per mode, both pointing to the resources URL', () => {
    const results = getSuggestions("sp resources");
    expect(results).toHaveLength(2);
    expect(
      results.every(
        (s: Suggestion) => s.url === `${BASE}/shadow-priest-resources`,
      ),
    ).toBe(true);
  });

  it('"sp pve resources" returns exactly 1 suggestion for the special resources page', () => {
    const results = getSuggestions("sp pve resources");
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(`${BASE}/shadow-priest-resources`);
  });

  // ---------------------------------------------------------------------------
  // Correct URLs
  // ---------------------------------------------------------------------------

  it('"sp pve gear" suggestion has url containing "shadow-priest-pve-dps-gear-best-in-slot"', () => {
    expect(getSuggestions("sp pve gear")[0].url).toContain(
      "shadow-priest-pve-dps-gear-best-in-slot",
    );
  });

  it('"sp pvp" guide suggestion has url containing "shadow-priest-pvp-guide"', () => {
    const guide = getSuggestions("sp pvp").find((s: Suggestion) =>
      s.url.includes("shadow-priest-pvp-guide"),
    );
    expect(guide).toBeDefined();
  });

  it('"sp" resources suggestion has url containing "shadow-priest-resources"', () => {
    const resources = getSuggestions("sp").find((s: Suggestion) =>
      s.url.includes("shadow-priest-resources"),
    );
    expect(resources).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Spec prefix matching (Phase B — no exact alias match → guide suggestions only)
  // ---------------------------------------------------------------------------

  it('"sha" returns suggestions for shadow-priest (prefix of "shadow priest")', () => {
    const results = getSuggestions("sha");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("shadow-priest");
    }
  });

  it('"sha" returns exactly 2 guide suggestions (pve + pvp guide)', () => {
    expect(getSuggestions("sha").length).toBe(2);
  });

  it('"blood d" returns suggestions for blood-death-knight (prefix of "blood death knight")', () => {
    const results = getSuggestions("blood d");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.specSlug).toBe("blood-death-knight");
    }
  });

  it('"xyz" returns empty array', () => {
    expect(getSuggestions("xyz")).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Suggestion shape
  // ---------------------------------------------------------------------------

  it("titles contain the separator ·", () => {
    for (const s of getSuggestions("sp")) {
      expect(s.title).toContain("·");
    }
  });

  it("id format is {slug}-{mode}-{urlSuffix}", () => {
    const result = getSuggestions("sp pve gear")[0];
    expect(result.id).toBe("shadow-priest-pve-gear-best-in-slot");
  });

  it('"sp pve gear" suggestion subtitle is "sp pve gear" (uses shortest spec alias)', () => {
    expect(getSuggestions("sp pve gear")[0].subtitle).toBe("sp pve gear");
  });

  it("empty input suggestions use shortest spec alias in subtitle", () => {
    const results = getSuggestions("");

    // shadow-priest shortest alias is "sp" → guide subtitles are "sp pve" and "sp pvp"
    const spGuides = results.filter(
      (s: Suggestion) => s.specSlug === "shadow-priest",
    );
    expect(spGuides).toHaveLength(2);
    for (const s of spGuides) {
      expect(s.subtitle).toMatch(/^sp /);
    }

    // blood-death-knight is a tank spec — only PVE guide, no PVP
    const bdkGuides = results.filter(
      (s: Suggestion) => s.specSlug === "blood-death-knight",
    );
    expect(bdkGuides).toHaveLength(1);
    for (const s of bdkGuides) {
      expect(s.subtitle).toMatch(/^bdk /);
    }
  });

  it("case-insensitive: 'SP PVE GEAR' returns same result as 'sp pve gear'", () => {
    const a = getSuggestions("sp pve gear");
    const b = getSuggestions("SP PVE GEAR");
    expect(b.length).toBe(a.length);
    expect(b[0].id).toBe(a[0].id);
  });
});
