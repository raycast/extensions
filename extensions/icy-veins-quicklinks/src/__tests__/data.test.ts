import { describe, it, expect } from "vitest";
import { specs } from "../data/specs";
import { pageMap } from "../data/pages";

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function hasPveAlias(alias: string): boolean {
  return pageMap.pve.some((e) => e.aliases.includes(alias));
}

function hasPvpAlias(alias: string): boolean {
  return pageMap.pvp.some((e) => e.aliases.includes(alias));
}

function hasAnyAlias(alias: string): boolean {
  return pageMap.any.some((e) => e.aliases.includes(alias));
}

// ---------------------------------------------------------------------------
// Spec tests
// ---------------------------------------------------------------------------

describe("specs", () => {
  it("every SpecEntry has a non-empty slug, pveRole, and at least one alias", () => {
    for (const entry of specs) {
      expect(
        entry.slug.length,
        `slug empty on entry: ${JSON.stringify(entry)}`,
      ).toBeGreaterThan(0);
      expect(
        entry.pveRole.length,
        `pveRole empty on slug "${entry.slug}"`,
      ).toBeGreaterThan(0);
      expect(
        entry.aliases.length,
        `no aliases on slug "${entry.slug}"`,
      ).toBeGreaterThan(0);
    }
  });

  it("all spec aliases are lowercase", () => {
    for (const entry of specs) {
      for (const alias of entry.aliases) {
        expect(
          alias,
          `alias "${alias}" on slug "${entry.slug}" is not lowercase`,
        ).toBe(alias.toLowerCase());
      }
    }
  });

  it("no duplicate aliases across all specs", () => {
    const seen = new Set<string>();
    for (const entry of specs) {
      for (const alias of entry.aliases) {
        expect(seen.has(alias), `duplicate alias "${alias}" found`).toBe(false);
        seen.add(alias);
      }
    }
  });

  it('"shadow priest" and "sp" are aliases on the same entry with slug "shadow-priest"', () => {
    const shadowPriest = specs.find((e) => e.slug === "shadow-priest");
    expect(shadowPriest, 'no entry with slug "shadow-priest"').toBeDefined();
    expect(shadowPriest!.aliases).toContain("shadow priest");
    expect(shadowPriest!.aliases).toContain("sp");
  });
});

// ---------------------------------------------------------------------------
// PvE page tests
// ---------------------------------------------------------------------------

describe("pageMap.pve", () => {
  const pveRequired = [
    "",
    "intro",
    "guide",
    "leveling",
    "easy",
    "build",
    "talent",
    "talents",
    "rotation",
    "cooldowns",
    "abilities",
    "stats",
    "priority",
    "gems",
    "enchants",
    "consumables",
    "gear",
    "bis",
    "m+",
    "mythic",
    "tips",
    "spells",
    "glossary",
  ];

  it("contains an entry for every required pve alias", () => {
    for (const alias of pveRequired) {
      expect(
        hasPveAlias(alias),
        `pve alias "${alias}" missing from pageMap.pve`,
      ).toBe(true);
    }
  });

  it("has no duplicate aliases within pve entries", () => {
    const seen = new Set<string>();
    for (const entry of pageMap.pve) {
      for (const alias of entry.aliases) {
        expect(seen.has(alias), `duplicate pve alias "${alias}"`).toBe(false);
        seen.add(alias);
      }
    }
  });

  it("all pve aliases are lowercase strings", () => {
    for (const entry of pageMap.pve) {
      for (const alias of entry.aliases) {
        expect(typeof alias).toBe("string");
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

// ---------------------------------------------------------------------------
// PvP page tests
// ---------------------------------------------------------------------------

describe("pageMap.pvp", () => {
  const pvpRequired = [
    "",
    "intro",
    "guide",
    "build",
    "talent",
    "talents",
    "gear",
    "bis",
    "rotation",
    "cooldowns",
    "abilities",
    "bg",
    "battleground",
    "blitz",
    "comps",
    "comp",
    "compositions",
    "macros",
    "races",
  ];

  it("contains an entry for every required pvp alias", () => {
    for (const alias of pvpRequired) {
      expect(
        hasPvpAlias(alias),
        `pvp alias "${alias}" missing from pageMap.pvp`,
      ).toBe(true);
    }
  });

  it("has no duplicate aliases within pvp entries", () => {
    const seen = new Set<string>();
    for (const entry of pageMap.pvp) {
      for (const alias of entry.aliases) {
        expect(seen.has(alias), `duplicate pvp alias "${alias}"`).toBe(false);
        seen.add(alias);
      }
    }
  });

  it("all pvp aliases are lowercase strings", () => {
    for (const entry of pageMap.pvp) {
      for (const alias of entry.aliases) {
        expect(typeof alias).toBe("string");
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

// ---------------------------------------------------------------------------
// pageMap.any tests
// ---------------------------------------------------------------------------

describe("pageMap.any", () => {
  it('"resources" lives in pageMap.any, not pve or pvp', () => {
    expect(
      hasAnyAlias("resources"),
      '"resources" missing from pageMap.any',
    ).toBe(true);
    expect(
      hasPveAlias("resources"),
      '"resources" should not be in pageMap.pve',
    ).toBe(false);
    expect(
      hasPvpAlias("resources"),
      '"resources" should not be in pageMap.pvp',
    ).toBe(false);
  });

  it('"resources" entry has special=true', () => {
    const entry = pageMap.any.find((e) => e.aliases.includes("resources"));
    expect(entry, '"resources" entry not found in pageMap.any').toBeDefined();
    expect(entry!.special).toBe(true);
  });

  it("has no duplicate aliases within any entries", () => {
    const seen = new Set<string>();
    for (const entry of pageMap.any) {
      for (const alias of entry.aliases) {
        expect(seen.has(alias), `duplicate any alias "${alias}"`).toBe(false);
        seen.add(alias);
      }
    }
  });

  it("all any aliases are lowercase strings", () => {
    for (const entry of pageMap.any) {
      for (const alias of entry.aliases) {
        expect(typeof alias).toBe("string");
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Spec coverage — all known specs
// ---------------------------------------------------------------------------

describe("spec coverage — all known specs", () => {
  it("specs contains exactly 40 entries", () => {
    expect(specs.length).toBe(40);
  });

  it("blood-death-knight exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "blood-death-knight");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("blood death knight");
  });

  it("frost-death-knight exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "frost-death-knight");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("frost death knight");
  });

  it("unholy-death-knight exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "unholy-death-knight");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("unholy death knight");
  });

  it("havoc-demon-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "havoc-demon-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("havoc demon hunter");
  });

  it("vengeance-demon-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "vengeance-demon-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("vengeance demon hunter");
  });

  it("devourer-demon-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "devourer-demon-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("devourer demon hunter");
  });

  it("balance-druid exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "balance-druid");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("balance druid");
  });

  it("feral-druid exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "feral-druid");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("feral druid");
  });

  it("guardian-druid exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "guardian-druid");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("guardian druid");
  });

  it("restoration-druid exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "restoration-druid");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("restoration druid");
  });

  it("devastation-evoker exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "devastation-evoker");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("devastation evoker");
  });

  it("preservation-evoker exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "preservation-evoker");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("preservation evoker");
  });

  it("augmentation-evoker exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "augmentation-evoker");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("augmentation evoker");
  });

  it("beast-mastery-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "beast-mastery-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("beast mastery hunter");
  });

  it("marksmanship-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "marksmanship-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("marksmanship hunter");
  });

  it("survival-hunter exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "survival-hunter");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("survival hunter");
  });

  it("arcane-mage exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "arcane-mage");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("arcane mage");
  });

  it("fire-mage exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "fire-mage");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("fire mage");
  });

  it("frost-mage exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "frost-mage");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("frost mage");
  });

  it("brewmaster-monk exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "brewmaster-monk");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("brewmaster monk");
  });

  it("mistweaver-monk exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "mistweaver-monk");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("mistweaver monk");
  });

  it("windwalker-monk exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "windwalker-monk");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("windwalker monk");
  });

  it("holy-paladin exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "holy-paladin");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("holy paladin");
  });

  it("protection-paladin exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "protection-paladin");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("protection paladin");
  });

  it("retribution-paladin exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "retribution-paladin");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("retribution paladin");
  });

  it("discipline-priest exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "discipline-priest");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("discipline priest");
  });

  it("holy-priest exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "holy-priest");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("holy priest");
  });

  it("shadow-priest exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "shadow-priest");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("shadow priest");
  });

  it("assassination-rogue exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "assassination-rogue");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("assassination rogue");
  });

  it("outlaw-rogue exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "outlaw-rogue");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("outlaw rogue");
  });

  it("subtlety-rogue exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "subtlety-rogue");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("subtlety rogue");
  });

  it("elemental-shaman exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "elemental-shaman");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("elemental shaman");
  });

  it("enhancement-shaman exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "enhancement-shaman");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("enhancement shaman");
  });

  it("restoration-shaman exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "restoration-shaman");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("healer");
    expect(e!.aliases).toContain("restoration shaman");
  });

  it("affliction-warlock exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "affliction-warlock");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("affliction warlock");
  });

  it("demonology-warlock exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "demonology-warlock");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("demonology warlock");
  });

  it("destruction-warlock exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "destruction-warlock");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("destruction warlock");
  });

  it("arms-warrior exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "arms-warrior");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("arms warrior");
  });

  it("fury-warrior exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "fury-warrior");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("dps");
    expect(e!.aliases).toContain("fury warrior");
  });

  it("protection-warrior exists with correct role and alias", () => {
    const e = specs.find((s) => s.slug === "protection-warrior");
    expect(e).toBeDefined();
    expect(e!.pveRole).toBe("tank");
    expect(e!.aliases).toContain("protection warrior");
  });
});

// ---------------------------------------------------------------------------
// Cross-collection: pve+pvp+any aliases are individually internally unique
// (already tested per-collection above; this ensures no spec alias collides
// with itself — page alias uniqueness is scoped per-collection by design)
// ---------------------------------------------------------------------------

describe("pageMap overall", () => {
  it("pve, pvp, and any entry arrays are all non-empty", () => {
    expect(pageMap.pve.length).toBeGreaterThan(0);
    expect(pageMap.pvp.length).toBeGreaterThan(0);
    expect(pageMap.any.length).toBeGreaterThan(0);
  });
});
