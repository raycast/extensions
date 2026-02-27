import { homedir } from "os";
import { join } from "path";
import type { ModelTier } from "./types";

export const CLAUDE_DIR = join(homedir(), ".claude");
export const CREDENTIALS_PATH = join(CLAUDE_DIR, ".credentials.json");
export const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

export const CODEX_AUTH_PATH = join(homedir(), ".codex", "auth.json");

export const USAGE_API_URL = "https://api.anthropic.com/api/oauth/usage";

// Per-million-token pricing
export const PRICING: Record<
  ModelTier,
  { input: number; output: number; cacheCreation: number; cacheRead: number }
> = {
  opus: {
    input: 15,
    output: 75,
    cacheCreation: 18.75, // 1.25x input
    cacheRead: 1.5, // 0.1x input
  },
  sonnet: {
    input: 3,
    output: 15,
    cacheCreation: 3.75, // 1.25x input
    cacheRead: 0.3, // 0.1x input
  },
};

// Map model IDs to tiers
const MODEL_TIER_MAP: Record<string, ModelTier> = {
  "claude-opus-4-6": "opus",
  "claude-opus-4-20250514": "opus",
  "claude-sonnet-4-6": "sonnet",
  "claude-sonnet-4-20250514": "sonnet",
  "claude-haiku-4-5-20251001": "sonnet", // haiku pricing ~= sonnet for estimation
};

export function getModelTier(modelId: string): ModelTier {
  if (MODEL_TIER_MAP[modelId]) return MODEL_TIER_MAP[modelId];
  if (modelId.includes("opus")) return "opus";
  if (modelId.includes("sonnet")) return "sonnet";
  if (modelId.includes("haiku")) return "sonnet";
  return "opus"; // conservative default
}
