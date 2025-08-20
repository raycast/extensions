export type AchievementId =
  | "helloRaycast"
  | "shortcutSavant"
  | "daemonWrangler"
  | "cronCommandant"
  | "bulkSend"
  | "goldenHour"
  | "twinPeaks"
  | "synergyOnline"
  | "freshStartPro"
  | "killionaire"
  | "afkIrl"
  | "insufficientFunds"
  | "whoNeedsIdle"
  | "silentMaxxing"
  | "holdTheClicker"
  | "milestoneTrifecta"
  | "optimizerOnline"
  | "timeBender"
  | "costEngineer";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  helloRaycast: {
    id: "helloRaycast",
    name: "Hello, Raycast",
    description: "Earn 1,000 RC (lifetime).",
    icon: "👋",
  },
  shortcutSavant: {
    id: "shortcutSavant",
    name: "Shortcut Savant",
    description: "Reach Active L10 – Shortcut Maestro.",
    icon: "⌨️",
  },
  daemonWrangler: {
    id: "daemonWrangler",
    name: "Daemon Wrangler",
    description: "Reach Idle L5 – Background Daemon or 10 RC/sec.",
    icon: "👻",
  },
  cronCommandant: {
    id: "cronCommandant",
    name: "Cron Commandant",
    description: "Reach Idle L10 – Cron Job Army or 100 RC/sec.",
    icon: "⏰",
  },
  bulkSend: {
    id: "bulkSend",
    name: "Bulk Send",
    description: "Unlock Bulk Purchase and buy 10 levels in a single action.",
    icon: "🛒",
  },
  goldenHour: {
    id: "goldenHour",
    name: "Golden Hour",
    description: "Trigger 5 Lucky Command events in one run.",
    icon: "✨",
  },
  twinPeaks: {
    id: "twinPeaks",
    name: "Twin Peaks",
    description: "Hit the L25 milestone in any two trees in the same run.",
    icon: "🏔️",
  },
  synergyOnline: {
    id: "synergyOnline",
    name: "Synergy Online",
    description: "Own ≥25 levels in each tree simultaneously.",
    icon: "🔗",
  },
  freshStartPro: {
    id: "freshStartPro",
    name: "Fresh Start Pro",
    description: "Perform your first Prestige with ≥10 Command Stars.",
    icon: "🌟",
  },
  killionaire: {
    id: "killionaire",
    name: "Command+Killionaire",
    description: "Earn 1,000,000 RC (lifetime).",
    icon: "💰",
  },
  afkIrl: {
    id: "afkIrl",
    name: "AFK IRL",
    description: "Return after ≥12h and claim offline progress.",
    icon: "🛌",
  },
  insufficientFunds: {
    id: "insufficientFunds",
    name: "Insufficient Funds, Sufficient Enthusiasm",
    description: "Attempt to buy upgrades 20 times with not enough RC.",
    icon: "💳",
  },
  whoNeedsIdle: {
    id: "whoNeedsIdle",
    name: "Who Needs Idle?",
    description: "Reach 250k RC with idle ≤1 RC/sec at that moment.",
    icon: "🙅‍♂️",
  },
  silentMaxxing: {
    id: "silentMaxxing",
    name: "Silent Maxxing",
    description: "Use Buy Max to purchase at least 50 levels in one go.",
    icon: "🤫",
  },
  holdTheClicker: {
    id: "holdTheClicker",
    name: "Its a feature, not a bug.",
    description: "Hold the clicker: ≥180 clicks in 30s.",
    icon: "🖱️",
  },
  milestoneTrifecta: {
    id: "milestoneTrifecta",
    name: "Milestone Trifecta",
    description: "Reach the L25 milestone in Active, Idle, and Efficiency in a single run.",
    icon: "🎯",
  },
  optimizerOnline: {
    id: "optimizerOnline",
    name: "Optimizer Online",
    description: "Purchase Efficiency L20 – AI Optimizer.",
    icon: "🧠",
  },
  timeBender: {
    id: "timeBender",
    name: "Time Bender",
    description: "Claim offline gains boosted by Faster Tick at least once.",
    icon: "⏱️",
  },
  costEngineer: {
    id: "costEngineer",
    name: "Cost Engineer",
    description: "Achieve a ≥25% total upgrade cost reduction.",
    icon: "🏷️",
  },
};
