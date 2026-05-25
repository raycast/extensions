import type { Mode, PageMap, PageEntry } from "../types";

export const pageMap: PageMap = {
  pve: [
    {
      urlSuffix: "guide",
      aliases: ["", "intro", "guide"],
      displayTitle: "Guide",
    },
    {
      urlSuffix: "leveling-guide",
      aliases: ["leveling"],
      special: true,
      displayTitle: "Leveling Guide",
    },
    { urlSuffix: "easy-mode", aliases: ["easy"], displayTitle: "Easy Mode" },
    {
      urlSuffix: "spec-builds-talents",
      aliases: ["build", "talent", "talents"],
      displayTitle: "Builds & Talents",
    },
    {
      urlSuffix: "rotation-cooldowns-abilities",
      aliases: ["rotation", "cooldowns", "abilities"],
      displayTitle: "Rotation",
    },
    {
      urlSuffix: "stat-priority",
      aliases: ["stats", "priority"],
      displayTitle: "Stat Priority",
    },
    {
      urlSuffix: "gems-enchants-consumables",
      aliases: ["gems", "enchants", "consumables"],
      displayTitle: "Gems & Enchants",
    },
    {
      urlSuffix: "gear-best-in-slot",
      aliases: ["gear", "bis"],
      displayTitle: "Gear",
    },
    {
      urlSuffix: "mythic-plus-tips",
      aliases: ["m+", "mythic", "tips"],
      displayTitle: "Mythic+ Tips",
    },
    {
      urlSuffix: "spell-summary",
      aliases: ["spells", "glossary"],
      displayTitle: "Spell Summary",
    },
  ],
  pvp: [
    {
      urlSuffix: "pvp-guide",
      aliases: ["", "intro", "guide"],
      displayTitle: "Guide",
    },
    {
      urlSuffix: "pvp-talents-and-builds",
      aliases: ["build", "talent", "talents"],
      displayTitle: "Talents & Builds",
    },
    {
      urlSuffix: "pvp-stat-priority-gear-and-trinkets",
      aliases: ["gear", "bis"],
      displayTitle: "Gear & Trinkets",
    },
    {
      urlSuffix: "pvp-rotation-and-playstyle",
      aliases: ["rotation", "cooldowns", "abilities"],
      displayTitle: "Rotation & Playstyle",
    },
    {
      urlSuffix: "battleground-blitz-pvp-guide",
      aliases: ["bg", "battleground", "blitz"],
      displayTitle: "Battleground Blitz",
    },
    {
      urlSuffix: "pvp-best-arena-compositions",
      aliases: ["comps", "comp", "compositions"],
      displayTitle: "Arena Comps",
    },
    {
      urlSuffix: "pvp-useful-macros",
      aliases: ["macros"],
      displayTitle: "Macros",
    },
    {
      urlSuffix: "pvp-best-races-and-racials",
      aliases: ["races"],
      displayTitle: "Races & Racials",
    },
  ],
  any: [
    {
      urlSuffix: "resources",
      aliases: ["resources"],
      special: true,
      displayTitle: "Resources",
    },
  ],
};

export function getPagesForMode(mode: Mode): PageEntry[] {
  return [...pageMap[mode], ...pageMap.any];
}
