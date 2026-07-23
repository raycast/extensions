export type FeatureState = "disabled" | "preview" | "active";

export type FeatureId =
  | "portable-store"
  | "raycast-library"
  | "raycast-exact-search"
  | "sqlite-search"
  | "qmd-discovery"
  | "openai-enhancement"
  | "project-context"
  | "context7-research"
  | "web-research"
  | "exa-research"
  | "github-mcp-research"
  | "anthropic-provider"
  | "google-provider"
  | "local-cli"
  | "mcp-read"
  | "mcp-write"
  | "feedback"
  | "optimization";

export interface FeatureStatus {
  id: FeatureId;
  title: string;
  description: string;
  activationOrder: number;
  defaultState: FeatureState;
  blocksLaterActivations: boolean;
  requestedState: FeatureState;
  effectiveState: FeatureState;
  reason?: string;
  verification?: {
    status: "passed";
    checkedAt: string;
    command: string;
  };
  history: [];
}

const STORE_FEATURES: readonly FeatureStatus[] = [
  active("portable-store", "Portable Markdown Store", "Readable files remain the recoverable source of truth."),
  active("raycast-library", "Raycast Visual Library", "Browse and preview prompts visually."),
  active("raycast-exact-search", "Raycast Exact Search", "Search titles, prompt text, tags, targets, and aliases."),
  disabled(
    "sqlite-search",
    "SQLite Search",
    "Use a rebuildable local database for fast filtering and full-text search.",
    1,
  ),
  disabled("qmd-discovery", "QMD Semantic Discovery", "Find prompts by meaning when the exact words differ.", 2),
  disabled("openai-enhancement", "OpenAI Enhancement", "Turn rough thoughts into validated, editable prompts.", 3),
  disabled(
    "project-context",
    "Local Project Context",
    "Personalize enhancement from a selected Git project without modifying it.",
    4,
  ),
  disabled("context7-research", "Context7 Research", "Retrieve version-specific library and API documentation.", 5),
  disabled("web-research", "Current Web Research", "Retrieve current facts from official and primary sources.", 6),
  disabled("exa-research", "Exa Research", "Search broader technical pages, code, and papers.", 7),
  disabled("github-mcp-research", "GitHub MCP Research", "Use GitHub-specific research during prompt enhancement.", 8),
  disabled("anthropic-provider", "Anthropic Provider", "Enhance prompts with Anthropic models.", 9),
  disabled("google-provider", "Google Provider", "Enhance prompts with Google models.", 10),
  disabled("local-cli", "Local CLI", "Use the same prompt library from terminal-based coding tools.", 11),
  disabled("mcp-read", "Read-only MCP", "Let coding agents search and retrieve prompts through local tools.", 12),
  disabled("mcp-write", "MCP Mutations", "Create, update, archive, and enhance with explicit confirmation.", 13),
  disabled(
    "feedback",
    "Outcome Feedback",
    "Record optional ratings, corrections, and results for prompt versions.",
    14,
  ),
  disabled(
    "optimization",
    "Prompt Optimization",
    "Compare candidates against saved evidence before human approval.",
    15,
  ),
];

export async function loadFeatureStatuses(_path?: string): Promise<FeatureStatus[]> {
  void _path;
  return STORE_FEATURES.map((status) => ({ ...status }));
}

export function getFeatureStatus(statuses: FeatureStatus[], id: FeatureId): FeatureStatus {
  const status = statuses.find((item) => item.id === id);
  if (!status) throw new Error(`Unknown feature: ${id}.`);
  return status;
}

function active(id: FeatureId, title: string, description: string): FeatureStatus {
  return {
    id,
    title,
    description,
    activationOrder: 0,
    defaultState: "active",
    blocksLaterActivations: false,
    requestedState: "active",
    effectiveState: "active",
    history: [],
  };
}

function disabled(id: FeatureId, title: string, description: string, activationOrder: number): FeatureStatus {
  return {
    id,
    title,
    description,
    activationOrder,
    defaultState: "disabled",
    blocksLaterActivations: false,
    requestedState: "disabled",
    effectiveState: "disabled",
    reason: "Not included in the initial Raycast Store release.",
    history: [],
  };
}
