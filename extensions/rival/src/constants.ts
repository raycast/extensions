// --------------------------------------------------------------------------
// Rival Raycast Extension - Constants
// --------------------------------------------------------------------------

/** Base URL for all Rival links */
export const RIVAL_BASE = "https://rival.tips";

/** API endpoint that returns the model catalog */
export const LENS_API_URL = `${RIVAL_BASE}/api/lens`;

/** LocalStorage key for the cached payload */
export const CACHE_KEY = "rival-lens-cache";

/** How long cached data stays fresh (1 hour) */
export const CACHE_TTL_MS = 60 * 60 * 1000;

// --------------------------------------------------------------------------
// Provider display names
// --------------------------------------------------------------------------

export const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  meta: "Meta AI",
  xai: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral AI",
  qwen: "Qwen",
  nvidia: "NVIDIA",
  amazon: "Amazon",
  stability: "Stability AI",
  midjourney: "Midjourney",
  minimax: "MiniMax",
  "black-forest-labs": "Black Forest Labs",
  bytedance: "ByteDance",
  perplexity: "Perplexity",
  elevenlabs: "ElevenLabs",
  moonshotai: "Moonshot AI",
  xiaomi: "Xiaomi",
  inception: "Inception",
  upstage: "Upstage",
  zhipu: "Zhipu AI",
  openrouter: "OpenRouter",
  "arcee-ai": "Arcee AI",
  kokoro: "Kokoro",
  orpheus: "Orpheus",
};

// --------------------------------------------------------------------------
// Provider brand colors (hex)
// --------------------------------------------------------------------------

export const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10A37F",
  anthropic: "#6366F1",
  google: "#4285F4",
  meta: "#0081FB",
  xai: "#EF4444",
  deepseek: "#3B82F6",
  mistral: "#06B6D4",
  qwen: "#F97316",
  nvidia: "#76B900",
  amazon: "#FF9900",
  stability: "#8B5CF6",
  midjourney: "#A855F7",
  minimax: "#EC4899",
  "black-forest-labs": "#10B981",
  bytedance: "#FE2C55",
  perplexity: "#20B8CD",
  elevenlabs: "#333333",
  moonshotai: "#6366F1",
  xiaomi: "#FF6900",
};
