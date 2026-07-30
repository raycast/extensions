export const CATEGORY_IDS = [
  "getting-started",
  "cli",
  "slash",
  "keyboard",
  "models",
  "configuration",
  "tools",
  "skills-memory",
  "gateway",
  "automation",
  "mcp",
  "environment",
  "troubleshooting",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
export type CategoryFilter = "all" | CategoryId;

export interface CommandExample {
  title: string;
  command: string;
  description?: string;
}

export interface CommandParameter {
  name: string;
  description: string;
}

export interface CommandDetails {
  whenToUse?: string;
  prerequisites?: string[];
  parameters?: CommandParameter[];
  workflow?: CommandExample[];
  notes?: string[];
}

export const STATUS_BADGES = ["CAUTION", "PERSISTS", "SESSION", "RESTART", "DEPRECATED", "NEW"] as const;
export type StatusBadge = (typeof STATUS_BADGES)[number];

export interface CheatsheetItem {
  id: string;
  name: string;
  description: string;
  usage: string;
  examples?: CommandExample[];
  category: CategoryId;
  tags: string[];
  documentationUrl: string;
  aliases?: string[];
  warning?: string;
  platforms?: string[];
  statuses?: StatusBadge[];
  details?: CommandDetails;
}

export interface GeneratedCheatsheetData {
  source: {
    repository: string;
    commit: string;
    generatedAt: string;
  };
  items: CheatsheetItem[];
}

export interface ExtensionPreferences {
  preferredModel: string;
  preferredProvider: string;
  primaryContent: "example" | "usage";
  showDetailPreview: boolean;
}
