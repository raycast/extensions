const agentIcons: Record<string, string> = {
  "tracking-and-measurement-specialist": "📡",
  "game-audio-engineer": "🔊",
  "godot-gameplay-scripter": "📜",
  "report-distribution-agent": "📬",
  "agentic-identity-and-trust-architect": "🔐",
  "identity-graph-operator": "🔗",
  "roblox-avatar-creator": "👗",
};

const subgroupIcons: Record<string, string> = {
  "cross-engine-agents": "🧩",
  unity: "🔷",
  "unreal-engine": "🛠️",
  godot: "🌀",
  "roblox-studio": "🧱",
};

const defaultDivisionIcons: Record<string, string> = {
  engineering: "💻",
  design: "🎨",
  "paid-media": "💰",
  marketing: "📢",
  product: "📊",
  "project-management": "🎬",
  testing: "🧪",
  support: "🛟",
  "spatial-computing": "🥽",
  specialized: "🎯",
  "game-development": "🎮",
};

export function getDivisionIcon(division: string, emoji?: string): string {
  return emoji ?? defaultDivisionIcons[division] ?? "🤖";
}

export function getAgentIcon(
  agentSlug: string,
  division: string,
  emoji?: string,
  rosterEmoji?: string,
  divisionEmoji?: string,
): string {
  return emoji ?? rosterEmoji ?? agentIcons[agentSlug] ?? getDivisionIcon(division, divisionEmoji);
}

export function getSubgroupIcon(subgroup: string): string {
  return subgroupIcons[subgroup] ?? "📁";
}
