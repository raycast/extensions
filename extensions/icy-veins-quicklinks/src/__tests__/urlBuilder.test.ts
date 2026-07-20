import { describe, it, expect } from "vitest";
import { buildUrl } from "../utils/urlBuilder";
import type { ParsedInput, SpecEntry, PageEntry } from "../types";

const shadowPriest: SpecEntry = {
  slug: "shadow-priest",
  pveRole: "dps",
  aliases: ["shadow priest", "sp"],
};

function makePveInput(urlSuffix: string, special?: boolean): ParsedInput {
  const page: PageEntry = {
    urlSuffix,
    aliases: [],
    special,
    displayTitle: urlSuffix,
  };
  return { spec: shadowPriest, mode: "pve", page };
}

function makePvpInput(urlSuffix: string, special?: boolean): ParsedInput {
  const page: PageEntry = {
    urlSuffix,
    aliases: [],
    special,
    displayTitle: urlSuffix,
  };
  return { spec: shadowPriest, mode: "pvp", page };
}

const BASE = "https://www.icy-veins.com/wow";

describe("buildUrl — PVE pages", () => {
  it("returns the pve guide URL for the default guide page", () => {
    const input = makePveInput("guide");
    expect(buildUrl(input)).toBe(`${BASE}/shadow-priest-pve-dps-guide`);
  });

  it("returns the pve gear URL", () => {
    expect(buildUrl(makePveInput("gear-best-in-slot"))).toBe(
      `${BASE}/shadow-priest-pve-dps-gear-best-in-slot`,
    );
  });

  it("returns the pve spec-builds-talents URL", () => {
    expect(buildUrl(makePveInput("spec-builds-talents"))).toBe(
      `${BASE}/shadow-priest-pve-dps-spec-builds-talents`,
    );
  });

  it("returns the pve rotation URL", () => {
    expect(buildUrl(makePveInput("rotation-cooldowns-abilities"))).toBe(
      `${BASE}/shadow-priest-pve-dps-rotation-cooldowns-abilities`,
    );
  });

  it("returns the pve stat-priority URL", () => {
    expect(buildUrl(makePveInput("stat-priority"))).toBe(
      `${BASE}/shadow-priest-pve-dps-stat-priority`,
    );
  });

  it("returns the pve gems-enchants-consumables URL", () => {
    expect(buildUrl(makePveInput("gems-enchants-consumables"))).toBe(
      `${BASE}/shadow-priest-pve-dps-gems-enchants-consumables`,
    );
  });

  it("returns the pve mythic-plus-tips URL", () => {
    expect(buildUrl(makePveInput("mythic-plus-tips"))).toBe(
      `${BASE}/shadow-priest-pve-dps-mythic-plus-tips`,
    );
  });

  it("returns the pve spell-summary URL", () => {
    expect(buildUrl(makePveInput("spell-summary"))).toBe(
      `${BASE}/shadow-priest-pve-dps-spell-summary`,
    );
  });

  it("returns the pve easy-mode URL", () => {
    expect(buildUrl(makePveInput("easy-mode"))).toBe(
      `${BASE}/shadow-priest-pve-dps-easy-mode`,
    );
  });
});

describe("buildUrl — special pages (mode-agnostic)", () => {
  it("returns the leveling-guide URL (special, pve context)", () => {
    expect(buildUrl(makePveInput("leveling-guide", true))).toBe(
      `${BASE}/shadow-priest-leveling-guide`,
    );
  });

  it("returns the resources URL (special, pve context)", () => {
    expect(buildUrl(makePveInput("resources", true))).toBe(
      `${BASE}/shadow-priest-resources`,
    );
  });

  it("returns the resources URL regardless of mode flag (pvp context)", () => {
    expect(buildUrl(makePvpInput("resources", true))).toBe(
      `${BASE}/shadow-priest-resources`,
    );
  });
});

describe("buildUrl — PVP pages", () => {
  it("returns the pvp guide URL", () => {
    expect(buildUrl(makePvpInput("pvp-guide"))).toBe(
      `${BASE}/shadow-priest-pvp-guide`,
    );
  });

  it("returns the pvp gear URL", () => {
    expect(buildUrl(makePvpInput("pvp-stat-priority-gear-and-trinkets"))).toBe(
      `${BASE}/shadow-priest-pvp-stat-priority-gear-and-trinkets`,
    );
  });

  it("returns the pvp builds URL", () => {
    expect(buildUrl(makePvpInput("pvp-talents-and-builds"))).toBe(
      `${BASE}/shadow-priest-pvp-talents-and-builds`,
    );
  });

  it("returns the pvp rotation URL", () => {
    expect(buildUrl(makePvpInput("pvp-rotation-and-playstyle"))).toBe(
      `${BASE}/shadow-priest-pvp-rotation-and-playstyle`,
    );
  });

  it("returns the pvp battleground blitz URL", () => {
    expect(buildUrl(makePvpInput("battleground-blitz-pvp-guide"))).toBe(
      `${BASE}/shadow-priest-battleground-blitz-pvp-guide`,
    );
  });

  it("returns the pvp arena compositions URL", () => {
    expect(buildUrl(makePvpInput("pvp-best-arena-compositions"))).toBe(
      `${BASE}/shadow-priest-pvp-best-arena-compositions`,
    );
  });

  it("returns the pvp useful macros URL", () => {
    expect(buildUrl(makePvpInput("pvp-useful-macros"))).toBe(
      `${BASE}/shadow-priest-pvp-useful-macros`,
    );
  });

  it("returns the pvp best races URL", () => {
    expect(buildUrl(makePvpInput("pvp-best-races-and-racials"))).toBe(
      `${BASE}/shadow-priest-pvp-best-races-and-racials`,
    );
  });
});
