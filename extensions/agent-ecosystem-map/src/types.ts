export type AssetType = "skill" | "agent" | "mcp" | "instruction" | "rule";

export type Provider =
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "windsurf"
  | "copilot"
  | "continue_dev";

export interface Asset {
  name: string;
  desc: string;
  type: AssetType;
  providers: Provider[];
  filePath: string;
  source: string;
  transport?: string;
  command?: string;
}

export interface ProviderInfo {
  name: string;
  color: string;
  letter: string;
  configDir: string;
}

export interface ScanResult {
  skills: Asset[];
  agents: Asset[];
  mcpServers: Asset[];
  instructions: Asset[];
  rules: Asset[];
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  claude: {
    name: "Claude",
    color: "#d4a0ff",
    letter: "C",
    configDir: ".claude",
  },
  codex: { name: "Codex", color: "#10a37f", letter: "X", configDir: ".codex" },
  gemini: {
    name: "Gemini",
    color: "#4285f4",
    letter: "G",
    configDir: ".gemini",
  },
  cursor: {
    name: "Cursor",
    color: "#00d4aa",
    letter: "U",
    configDir: ".cursor",
  },
  windsurf: {
    name: "Windsurf",
    color: "#06b6d4",
    letter: "W",
    configDir: ".windsurf",
  },
  copilot: {
    name: "Copilot",
    color: "#8b949e",
    letter: "P",
    configDir: ".github",
  },
  continue_dev: {
    name: "Continue",
    color: "#f97316",
    letter: "N",
    configDir: ".continue",
  },
};

export const TYPE_LABELS: Record<AssetType, string> = {
  skill: "Skill",
  agent: "Agent",
  mcp: "MCP Server",
  instruction: "Instruction",
  rule: "Rule",
};
