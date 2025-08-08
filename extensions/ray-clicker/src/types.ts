export type UpgradeCategory = "active" | "idle" | "efficiency";

export interface GameState {
  currency: number;
  clickValue: number;
  idleRate: number; // currency per second
  lastUpdate: number; // timestamp
  upgrades: {
    [upgradeId: string]: number; // Tracks individual upgrade levels by ID
  };
  milestoneBonuses: {
    [key: string]: number; // Track milestone bonuses by upgrade ID
  };
  prestige: {
    level: number;
    totalEarned: number;
    prestigePoints: number;
    lifetimeEarned: number;
    upgrades: {
      [key: string]: number;
    };
  };
  settings: {
    bulkBuyEnabled: boolean;
    autoClickEnabled: boolean;
    offlineProgressEnabled: boolean;
    luckyToastsEnabled: boolean;
  };
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  baseCost: number;
  costMultiplier: number;
  baseEffect: number;
  effectMultiplier: (level: number) => number;
  milestoneLevels: number[];
  milestoneMultipliers: number[];
  icon: string;
}

export const INITIAL_STATE: GameState = {
  currency: 0,
  clickValue: 1,
  idleRate: 0,
  lastUpdate: Date.now(),
  upgrades: {},
  milestoneBonuses: {},
  prestige: {
    level: 0,
    totalEarned: 0,
    prestigePoints: 0,
    lifetimeEarned: 0,
    upgrades: {},
  },
  settings: {
    bulkBuyEnabled: false,
    autoClickEnabled: false,
    offlineProgressEnabled: false,
    luckyToastsEnabled: true,
  },
};

export const UPGRADES: { [key: string]: UpgradeDefinition } = {
  // Active Upgrades (Clicking)
  homeRowNovice: {
    id: "homeRowNovice",
    name: "Home Row Novice",
    description: "You've learned proper finger placement, yielding more output per keystroke.",
    category: "active",
    baseCost: 10,
    costMultiplier: 1.15,
    baseEffect: 0.1,
    effectMultiplier: (level) => level * 1.1,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "⌨️",
  },
  ergonomicKeyboard: {
    id: "ergonomicKeyboard",
    name: "Ergonomic Keyboard",
    description: "Better hardware makes each click more productive.",
    category: "active",
    baseCost: 100,
    costMultiplier: 1.2,
    baseEffect: 0.5,
    effectMultiplier: (level) => level * 1.5,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "💻",
  },
  shortcutMaestro: {
    id: "shortcutMaestro",
    name: "Shortcut Maestro",
    description: "You've mastered Raycast shortcuts, executing commands with blazing efficiency.",
    category: "active",
    baseCost: 500,
    costMultiplier: 1.25,
    baseEffect: 2,
    effectMultiplier: (level) => level * 2,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "⚡️",
  },
  macroAutomation: {
    id: "macroAutomation",
    name: "Macro Automation",
    description: "You record macros that run on each click, packing more actions into one keystroke.",
    category: "active",
    baseCost: 2000,
    costMultiplier: 1.3,
    baseEffect: 5,
    effectMultiplier: (level) => level * 3,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "🔄",
  },
  hypertyping: {
    id: "hypertyping",
    name: "Hypertyping",
    description: "Your typing speed is inhuman, every tap showers currency.",
    category: "active",
    baseCost: 10000,
    costMultiplier: 1.35,
    baseEffect: 10,
    effectMultiplier: (level) => level * 4,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [3, 6, 12],
    icon: "⚡️",
  },

  // Idle Upgrades (Automation)
  basicScript: {
    id: "basicScript",
    name: "Basic Script",
    description: "A simple Raycast script runs periodically, clicking for you.",
    category: "idle",
    baseCost: 50,
    costMultiplier: 1.2,
    baseEffect: 0.1,
    effectMultiplier: (level) => level * 1.1,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "📜",
  },
  backgroundDaemon: {
    id: "backgroundDaemon",
    name: "Background Daemon",
    description: "A background process handles tasks continuously.",
    category: "idle",
    baseCost: 200,
    costMultiplier: 1.25,
    baseEffect: 1,
    effectMultiplier: (level) => level * 1.2,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "👻",
  },
  cronJobArmy: {
    id: "cronJobArmy",
    name: "Cron Job Army",
    description: "Multiple scheduled tasks now grind away every second.",
    category: "idle",
    baseCost: 1000,
    costMultiplier: 1.3,
    baseEffect: 10,
    effectMultiplier: (level) => level * 1.5,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "⏰",
  },
  aiAssistant: {
    id: "aiAssistant",
    name: "AI Assistant",
    description: "An AI learns to optimize idle gains, increasing efficiency.",
    category: "idle",
    baseCost: 5000,
    costMultiplier: 1.35,
    baseEffect: 50,
    effectMultiplier: (level) => level * 1.05,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "🤖",
  },
  serverCluster: {
    id: "serverCluster",
    name: "Server Cluster",
    description: "Cloud servers dedicated to running your Raycast commands nonstop.",
    category: "idle",
    baseCost: 25000,
    costMultiplier: 1.4,
    baseEffect: 100,
    effectMultiplier: (level) => level * 2,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [2, 5, 10],
    icon: "☁️",
  },

  // Efficiency Upgrades (Global Multipliers)
  optimizeStartup: {
    id: "optimizeStartup",
    name: "Optimize Startup",
    description: "Cleans up your system for a slight overall boost.",
    category: "efficiency",
    baseCost: 500,
    costMultiplier: 1.3,
    baseEffect: 0.1, // 10% global boost
    effectMultiplier: (level) => 1 + level * 0.05, // 5% additional per level
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [1.5, 2, 3],
    icon: "⚡",
  },
  raycastProMode: {
    id: "raycastProMode",
    name: "Raycast Pro Mode",
    description: "Efficient workflows reduce effort needed to upgrade.",
    category: "efficiency",
    baseCost: 1000,
    costMultiplier: 1.35,
    baseEffect: 0.05, // 5% cost reduction
    effectMultiplier: (level) => 1 - level * 0.02, // 2% additional reduction per level
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [1.5, 2, 3],
    icon: "🚀",
  },
  autoClickDaemon: {
    id: "autoClickDaemon",
    name: "Auto-Click Daemon",
    description: "Unlock auto-clicker (1/sec).",
    category: "efficiency",
    baseCost: 5000,
    costMultiplier: 1.45,
    baseEffect: 0.2,
    effectMultiplier: (level) => 1 + level * 0.2,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [1.5, 2, 3],
    icon: "🖱️",
  },
  luckyCommands: {
    id: "luckyCommands",
    name: "Lucky Commands",
    description: "1% chance of ×10 bonus events.",
    category: "efficiency",
    baseCost: 10000,
    costMultiplier: 1.5,
    baseEffect: 0.01,
    effectMultiplier: (level) => 1 + level * 0.01,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [1.5, 2, 3],
    icon: "🍀",
  },
  aiOptimizer: {
    id: "aiOptimizer",
    name: "AI Optimizer",
    description: "×2 all outputs.",
    category: "efficiency",
    baseCost: 50000,
    costMultiplier: 1.6,
    baseEffect: 2,
    effectMultiplier: (level) => 2 + level * 0.1,
    milestoneLevels: [10, 25, 50],
    milestoneMultipliers: [1.5, 2, 3],
    icon: "🧠",
  },
} as const;

export type UpgradeId = keyof typeof UPGRADES;

export const UPGRADE_CATEGORIES: { [key in UpgradeCategory]: { name: string; description: string; icon: string } } = {
  active: {
    name: "Active Production",
    description: "Boost your manual clicking power",
    icon: "👆",
  },
  idle: {
    name: "Idle Production",
    description: "Automate your income",
    icon: "🤖",
  },
  efficiency: {
    name: "Efficiency",
    description: "Global multipliers and bonuses",
    icon: "🎯",
  },
};

// Helper function to get all upgrades for a category
export function getUpgradesByCategory(category: UpgradeCategory): UpgradeDefinition[] {
  return Object.values(UPGRADES).filter((upgrade) => upgrade.category === category);
}

// Helper function to calculate upgrade cost
export function calculateUpgradeCost(upgrade: UpgradeDefinition, level: number): number {
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
}

// Helper function to calculate upgrade effect
export function calculateUpgradeEffect(upgrade: UpgradeDefinition, level: number, milestoneBonus: number = 1): number {
  return upgrade.baseEffect * upgrade.effectMultiplier(level) * milestoneBonus;
}

// Helper function to check for milestone levels
export function getMilestoneBonus(upgrade: UpgradeDefinition, level: number): number {
  // Use the HIGHEST milestone the current level qualifies for
  let idx = -1;
  for (let i = 0; i < upgrade.milestoneLevels.length; i++) {
    if (level >= upgrade.milestoneLevels[i]) idx = i;
  }
  return idx >= 0 ? upgrade.milestoneMultipliers[idx] : 1;
}
