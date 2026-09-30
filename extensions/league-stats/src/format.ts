import type { ObjectiveKey, Objectives } from "./match";

const QUEUES: Record<number, string> = {
  0: "Custom",
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  480: "Swiftplay",
  490: "Quickplay",
  700: "Clash",
  720: "ARAM Clash",
  830: "Co-op vs AI",
  840: "Co-op vs AI",
  850: "Co-op vs AI",
  870: "Co-op vs AI",
  880: "Co-op vs AI",
  890: "Co-op vs AI",
  900: "ARURF",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
  1710: "Arena",
  1810: "Swarm",
  1820: "Swarm",
  1830: "Swarm",
  1840: "Swarm",
  1900: "URF",
  2300: "Brawl",
};

/** Riot adds queues faster than any table can keep up, so unknown ones fall back to the game mode. */
const MODES: Record<string, string> = {
  CLASSIC: "Summoner's Rift",
  ARAM: "ARAM",
  CHERRY: "Arena",
  STRAWBERRY: "Swarm",
  URF: "URF",
  ARURF: "ARURF",
  ONEFORALL: "One for All",
  NEXUSBLITZ: "Nexus Blitz",
  ULTBOOK: "Ultimate Spellbook",
  TUTORIAL: "Tutorial",
  PRACTICETOOL: "Practice Tool",
};

export function queueName(queueId: number, mode: string): string {
  return QUEUES[queueId] ?? MODES[mode] ?? (mode ? mode[0] + mode.slice(1).toLowerCase() : "Unknown queue");
}

const ROLES: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

export function roleName(role: string): string | undefined {
  return ROLES[role];
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return kills + assists === 0 ? "0.00" : "Perfect";
  return ((kills + assists) / deaths).toFixed(2);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "Sep 19, 9:41 PM": compact enough for a list row, still carrying date and time. */
export function formatShortDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(epochMs: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - epochMs) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function percent(ratio: number | undefined): string {
  return ratio === undefined ? "–" : `${Math.round(ratio * 100)}%`;
}

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export function tierLabel(tier: string, division: string): string {
  const name = tier[0] + tier.slice(1).toLowerCase();
  return APEX_TIERS.has(tier) ? name : `${name} ${division}`;
}

const OBJECTIVES: [ObjectiveKey, string][] = [
  ["tower", "Towers"],
  ["inhibitor", "Inhibitors"],
  ["dragon", "Dragons"],
  ["baron", "Barons"],
  ["riftHerald", "Heralds"],
  ["horde", "Void Grubs"],
  ["atakhan", "Atakhan"],
];

export function objectiveText(objectives: Objectives): string {
  const parts = OBJECTIVES.filter(([key]) => objectives[key]).map(([key, label]) => `${objectives[key]} ${label}`);
  return parts.length ? parts.join(" · ") : "None";
}

/** "16.18.817.5716" becomes "16.18". */
export function patchName(gameVersion: string): string {
  return gameVersion.split(".").slice(0, 2).join(".");
}

export function multiKillName(count: number): string | undefined {
  return { 2: "Double Kill", 3: "Triple Kill", 4: "Quadra Kill", 5: "Penta Kill" }[count];
}
