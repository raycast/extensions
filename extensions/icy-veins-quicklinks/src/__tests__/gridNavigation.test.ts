import { describe, expect, it } from "vitest";
import {
  getPageQuery,
  getPageTitle,
  resolveGridState,
} from "../utils/gridNavigation";

describe("resolveGridState()", () => {
  it("shows all classes for an empty query", () => {
    const state = resolveGridState("");
    expect(state.kind).toBe("classes");
    if (state.kind !== "classes") throw new Error("Expected classes state");
    expect(state.items).toHaveLength(13);
  });

  it('shows priest specs for the exact class query "priest"', () => {
    const state = resolveGridState("priest");
    expect(state.kind).toBe("specs");
    if (state.kind !== "specs") throw new Error("Expected specs state");
    expect(state.classEntry?.slug).toBe("priest");
    expect(state.items.map((item) => item.name)).toEqual([
      "Discipline",
      "Holy",
      "Shadow",
    ]);
  });

  it('filters specs within a selected class for "priest sh"', () => {
    const state = resolveGridState("priest sh");
    expect(state.kind).toBe("specs");
    if (state.kind !== "specs") throw new Error("Expected specs state");
    expect(state.items).toHaveLength(1);
    expect(state.items[0].spec.slug).toBe("shadow-priest");
  });

  it('moves to mode selection for a spec alias like "sp"', () => {
    const state = resolveGridState("sp");
    expect(state.kind).toBe("modes");
    if (state.kind !== "modes") throw new Error("Expected modes state");
    expect(state.spec.slug).toBe("shadow-priest");
    expect(state.items).toEqual(["pve", "pvp"]);
  });

  it('moves to mode selection for a class-first query like "priest shadow"', () => {
    const state = resolveGridState("priest shadow");
    expect(state.kind).toBe("modes");
    if (state.kind !== "modes") throw new Error("Expected modes state");
    expect(state.spec.slug).toBe("shadow-priest");
  });

  it('filters the mode stage for a partial mode token like "sp pv"', () => {
    const state = resolveGridState("sp pv");
    expect(state.kind).toBe("modes");
    if (state.kind !== "modes") throw new Error("Expected modes state");
    expect(state.items).toEqual(["pve", "pvp"]);
  });

  it('shows pve pages for "sp pve"', () => {
    const state = resolveGridState("sp pve");
    expect(state.kind).toBe("pages");
    if (state.kind !== "pages") throw new Error("Expected pages state");
    expect(state.mode).toBe("pve");
    expect(state.items.length).toBe(11);
  });

  it('supports class-first page navigation for "priest shadow pve"', () => {
    const state = resolveGridState("priest shadow pve");
    expect(state.kind).toBe("pages");
    if (state.kind !== "pages") throw new Error("Expected pages state");
    expect(state.spec.slug).toBe("shadow-priest");
    expect(state.mode).toBe("pve");
  });

  it('filters page tiles by prefix for "sp pve g"', () => {
    const state = resolveGridState("sp pve g");
    expect(state.kind).toBe("pages");
    if (state.kind !== "pages") throw new Error("Expected pages state");
    expect(state.items).toHaveLength(4);
    expect(state.items.map((page) => page.urlSuffix)).toEqual([
      "guide",
      "gems-enchants-consumables",
      "gear-best-in-slot",
      "spell-summary",
    ]);
  });

  it('falls back to final guide results for direct page typing like "sp gear"', () => {
    const state = resolveGridState("sp gear");
    expect(state.kind).toBe("results");
    if (state.kind !== "results") throw new Error("Expected results state");
    expect(state.suggestions).toHaveLength(2);
  });
});

describe("gridNavigation helpers", () => {
  it("builds the query shown for a page tile", () => {
    const state = resolveGridState("sp pve");
    if (state.kind !== "pages") throw new Error("Expected pages state");

    const gearPage = state.items.find(
      (page) => page.urlSuffix === "gear-best-in-slot",
    );
    if (!gearPage) throw new Error("Expected gear page");

    expect(getPageQuery(state.spec, state.mode, gearPage)).toBe("sp pve gear");
  });

  it("returns a readable page title", () => {
    const state = resolveGridState("sp pvp");
    if (state.kind !== "pages") throw new Error("Expected pages state");

    const compsPage = state.items.find(
      (page) => page.urlSuffix === "pvp-best-arena-compositions",
    );
    if (!compsPage) throw new Error("Expected comps page");

    expect(getPageTitle(compsPage)).toBe("Arena Comps");
  });
});
