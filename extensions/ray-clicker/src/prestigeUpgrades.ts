// No imports needed

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  effect: (level: number) => number;
  maxLevel: number;
  icon: string;
  unlockLevel: number;
  category: "production" | "efficiency" | "special";
  // How to display the effect in UI accessories
  effectDisplay?: "additive" | "multiplicative" | "none";
}

export const PRESTIGE_UPGRADES: { [key: string]: PrestigeUpgrade } = {
  // Basic production boosts
  empoweredLegacy: {
    id: "empoweredLegacy",
    name: "Empowered Legacy",
    description: "+100% all generation per level",
    cost: 1,
    costMultiplier: 2,
    effect: (level) => 1 + level,
    maxLevel: 10,
    icon: "⚡️",
    unlockLevel: 1,
    category: "production",
    effectDisplay: "multiplicative",
  },
  quickStart: {
    id: "quickStart",
    name: "Quick Start",
    description: "Start with 50 currency per prestige level",
    cost: 1,
    costMultiplier: 1.5,
    effect: (level) => 50 * level,
    maxLevel: 10,
    icon: "🚀",
    unlockLevel: 1,
    category: "special",
    effectDisplay: "additive",
  },
  clickApprentice: {
    id: "clickApprentice",
    name: "Click Apprentice",
    description: "+1 base click value per level",
    cost: 2,
    costMultiplier: 1.5,
    effect: (level) => level,
    maxLevel: 20,
    icon: "👆",
    unlockLevel: 1,
    category: "production",
    effectDisplay: "additive",
  },
  idleApprentice: {
    id: "idleApprentice",
    name: "Idle Apprentice",
    description: "+0.1/sec base idle per level",
    cost: 2,
    costMultiplier: 1.5,
    effect: (level) => 0.1 * level,
    maxLevel: 20,
    icon: "🤖",
    unlockLevel: 1,
    category: "production",
    effectDisplay: "additive",
  },
  frugalShopper: {
    id: "frugalShopper",
    name: "Frugal Shopper",
    description: "-2% upgrade costs per level",
    cost: 3,
    costMultiplier: 2,
    effect: (level) => 1 - 0.02 * level,
    maxLevel: 25,
    icon: "💰",
    unlockLevel: 2,
    category: "efficiency",
    effectDisplay: "none",
  },
  fasterTick: {
    id: "fasterTick",
    name: "Faster Tick",
    description: "Idle ticks twice as fast",
    cost: 5,
    costMultiplier: 0,
    effect: () => 2,
    maxLevel: 1,
    icon: "⏱️",
    unlockLevel: 3,
    category: "special",
    effectDisplay: "none",
  },
  // Mid-tier upgrades
  bulkBuyerPro: {
    id: "bulkBuyerPro",
    name: "Bulk Buyer Pro",
    description: "Unlock buy max option",
    cost: 10,
    costMultiplier: 0,
    effect: () => 1,
    maxLevel: 1,
    icon: "🛒",
    unlockLevel: 5,
    category: "special",
    effectDisplay: "none",
  },
  secondWind: {
    id: "secondWind",
    name: "Second Wind",
    description: "Start with 1 level in each upgrade per prestige level",
    cost: 15,
    costMultiplier: 2,
    effect: (level) => level,
    maxLevel: 10,
    icon: "🌪️",
    unlockLevel: 8,
    category: "special",
    effectDisplay: "none",
  },
  // High-tier upgrades
  infinityEngine: {
    id: "infinityEngine",
    name: "Infinity Engine",
    description: "Multiply all production by 10",
    cost: 50,
    costMultiplier: 3,
    effect: (level) => Math.pow(10, level),
    maxLevel: 3,
    icon: "♾️",
    unlockLevel: 15,
    category: "production",
    effectDisplay: "multiplicative",
  },
  // Capstone upgrade
  ultimateAscension: {
    id: "ultimateAscension",
    name: "Ultimate Ascension",
    description: "Unlock meta-prestige layer",
    cost: 100,
    costMultiplier: 0,
    effect: () => 1,
    maxLevel: 1,
    icon: "🌟",
    unlockLevel: 25,
    category: "special",
    effectDisplay: "none",
  },
};

// Helper function to get prestige upgrades by category
export function getPrestigeUpgradesByCategory(category: PrestigeUpgrade["category"]): PrestigeUpgrade[] {
  return Object.values(PRESTIGE_UPGRADES).filter((upgrade) => upgrade.category === category);
}

// Helper function to get all prestige upgrades
// The prestigeLevel parameter is kept for backward compatibility but not used here
// as we now handle the filtering in the UI
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAvailablePrestigeUpgrades(_prestigeLevel: number): PrestigeUpgrade[] {
  // Return all upgrades, but they'll be filtered in the UI based on unlock level
  return Object.values(PRESTIGE_UPGRADES);
}

// Helper function to calculate prestige upgrade cost
export function calculatePrestigeUpgradeCost(upgrade: PrestigeUpgrade, level: number): number {
  const m = !isFinite(upgrade.costMultiplier) || upgrade.costMultiplier <= 0 ? 1 : upgrade.costMultiplier;
  return Math.ceil(upgrade.cost * Math.pow(m, level));
}

// Helper function to calculate prestige upgrade effect
export function calculatePrestigeUpgradeEffect(upgrade: PrestigeUpgrade, level: number): number {
  return upgrade.effect(level);
}
