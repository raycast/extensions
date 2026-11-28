import { Icon, Image } from "@raycast/api";

export type ProviderId = "raycast" | "gemini" | "openai" | "claude" | "groq" | "openrouter" | "custom";

/**
 * "openai" = OpenAI-compatible /chat/completions; "anthropic" = Claude Messages API;
 * "raycast" = Raycast AI (AI.ask, with Raycast Pro: no key, no host).
 */
export type Protocol = "openai" | "anthropic" | "raycast";

export type Provider = {
  id: ProviderId;
  name: string;
  /** Logo in assets/ (with an @dark variant where the logo is black or white), or a Raycast icon. */
  icon: Image.ImageLike;
  /** What AI Setup says before a key is entered. */
  keyHint: string;
  baseUrl: string;
  defaultModel: string;
  protocol: Protocol;
};

/** In the order of the Provider dropdown in AI Setup. Custom takes its API Host there. */
export const PROVIDERS: Record<ProviderId, Provider> = {
  raycast: {
    id: "raycast",
    icon: Icon.RaycastLogoNeg,
    keyHint: "No key needed: uses the AI in your Raycast Pro plan.",
    name: "Raycast AI",
    baseUrl: "",
    defaultModel: "google-gemini-3.5-flash-lite",
    protocol: "raycast",
  },
  gemini: {
    id: "gemini",
    icon: "provider-gemini.png",
    keyHint: "Paste your Gemini API key (from Google AI Studio).",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.5-flash-lite",
    protocol: "openai",
  },
  openai: {
    id: "openai",
    icon: "provider-openai.png",
    keyHint: "Paste your OpenAI API key.",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    protocol: "openai",
  },
  claude: {
    id: "claude",
    icon: "provider-claude.png",
    keyHint: "Paste your Anthropic API key.",
    name: "Claude",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-5-5",
    protocol: "anthropic",
  },
  groq: {
    id: "groq",
    icon: "provider-groq.png",
    keyHint: "Paste your Groq API key.",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    protocol: "openai",
  },
  openrouter: {
    id: "openrouter",
    icon: "provider-openrouter.png",
    keyHint: "Paste your OpenRouter API key.",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-3.5-flash-lite",
    protocol: "openai",
  },
  custom: {
    id: "custom",
    name: "Custom",
    icon: Icon.Network,
    keyHint: "Your server's key, if it needs one (a local Ollama or LM Studio doesn't).",
    baseUrl: "",
    defaultModel: "",
    protocol: "openai",
  },
};

/** The provider for a saved value; unknown or missing falls back to Gemini. */
export function providerOf(id: string | undefined): Provider {
  return id && id in PROVIDERS ? PROVIDERS[id as ProviderId] : PROVIDERS.gemini;
}
