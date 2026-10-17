import { ConnectMethod } from "../connect";
import { Connections } from "../connections";
import { Deps } from "../deps";
import { ProviderId, ProviderUsage, Settings } from "../types";
import { fetchClaudeUsage } from "./claude";
import { fetchCodexUsage } from "./codex";
import { fetchCopilotUsage } from "./copilot";
import { fetchCursorUsage } from "./cursor";
import { CREATE_KEY_URL as DEEPSEEK_CREATE_KEY_URL, fetchDeepSeekUsage } from "./deepseek";
import { fetchGeminiUsage } from "./gemini";
import { CREATE_KEY_URL as KIMI_CREATE_KEY_URL, fetchKimiUsage } from "./kimi";
import { CREATE_KEY_URL as MOONSHOT_CREATE_KEY_URL, fetchMoonshotUsage } from "./moonshot";
import { fetchOpenRouterUsage } from "./openrouter";
import { CREATE_KEY_URL as ZAI_CREATE_KEY_URL, fetchZaiUsage } from "./zai";

export interface Provider {
  id: ProviderId;
  name: string;
  // Where the user sees the same numbers on the web.
  dashboardUrl: string;
  // Site used for the list icon (via Raycast's favicon helper).
  iconUrl: string;
  // Bundled icon files in assets/, used instead of the favicon when the site's favicon doesn't read in both themes.
  iconAsset?: { light: string; dark: string };
  // How Connect signs this provider in.
  connect: ConnectMethod;
  // Connections the extension stores for this provider, removed by Disconnect.
  forget: (keyof Connections)[];
  // Throws a ProviderError with kind "not-connected" when no credentials are found.
  fetchUsage(deps: Deps, settings: Settings): Promise<ProviderUsage>;
}

// Display order in the list.
export const PROVIDERS: Provider[] = [
  {
    id: "claude",
    name: "Claude",
    dashboardUrl: "https://claude.ai/settings/usage",
    iconUrl: "https://claude.ai",
    connect: { kind: "claude" },
    forget: ["claudeKeychain", "claudeSessionKey"],
    fetchUsage: fetchClaudeUsage,
  },
  {
    id: "codex",
    name: "Codex",
    dashboardUrl: "https://chatgpt.com/codex/settings/usage",
    iconUrl: "https://chatgpt.com",
    connect: { kind: "codex" },
    forget: [],
    fetchUsage: fetchCodexUsage,
  },
  {
    id: "cursor",
    name: "Cursor",
    dashboardUrl: "https://cursor.com/dashboard?tab=usage",
    iconUrl: "https://cursor.com",
    connect: { kind: "cursor" },
    forget: ["cursorCookie"],
    fetchUsage: fetchCursorUsage,
  },
  {
    id: "gemini",
    name: "Gemini",
    dashboardUrl: "https://aistudio.google.com/usage",
    iconUrl: "https://gemini.google.com",
    connect: { kind: "gemini" },
    forget: [],
    fetchUsage: fetchGeminiUsage,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    dashboardUrl: "https://github.com/settings/copilot",
    iconUrl: "https://github.com",
    iconAsset: { light: "github-mark.svg", dark: "github-mark-dark.svg" },
    connect: { kind: "github" },
    forget: [],
    fetchUsage: fetchCopilotUsage,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    dashboardUrl: "https://openrouter.ai/settings/credits",
    iconUrl: "https://openrouter.ai",
    connect: { kind: "openrouter" },
    forget: ["openrouterApiKey"],
    fetchUsage: fetchOpenRouterUsage,
  },
  {
    id: "zai",
    name: "z.ai",
    dashboardUrl: "https://z.ai/manage-apikey/subscription",
    iconUrl: "https://z.ai",
    connect: {
      kind: "api-key",
      field: "zaiApiKey",
      region: "zaiRegion",
      keyUrl: ZAI_CREATE_KEY_URL,
      keyPattern: /^[A-Za-z0-9]{20,}\.[A-Za-z0-9]{8,}$/,
      placeholder: "Paste your z.ai API key",
    },
    forget: ["zaiApiKey", "zaiRegion"],
    fetchUsage: fetchZaiUsage,
  },
  {
    id: "kimi",
    name: "Kimi Code",
    dashboardUrl: "https://www.kimi.com/code",
    iconUrl: "https://www.kimi.com",
    connect: {
      kind: "api-key",
      field: "kimiApiKey",
      keyUrl: KIMI_CREATE_KEY_URL,
      keyPattern: /^sk-[A-Za-z0-9_-]{20,}$/,
      placeholder: "Paste your Kimi Code API key",
    },
    forget: ["kimiApiKey"],
    fetchUsage: fetchKimiUsage,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    dashboardUrl: "https://platform.deepseek.com/usage",
    iconUrl: "https://www.deepseek.com",
    connect: {
      kind: "api-key",
      field: "deepseekApiKey",
      keyUrl: DEEPSEEK_CREATE_KEY_URL,
      keyPattern: /^sk-[a-f0-9]{32}$/,
      placeholder: "Paste your DeepSeek API key",
    },
    forget: ["deepseekApiKey"],
    fetchUsage: fetchDeepSeekUsage,
  },
  {
    id: "moonshot",
    name: "Moonshot",
    dashboardUrl: "https://platform.moonshot.ai/console/account",
    iconUrl: "https://www.moonshot.ai",
    connect: {
      kind: "api-key",
      field: "moonshotApiKey",
      region: "moonshotRegion",
      keyUrl: MOONSHOT_CREATE_KEY_URL,
      keyPattern: /^sk-[A-Za-z0-9]{32,}$/,
      placeholder: "Paste your Moonshot API key",
    },
    forget: ["moonshotApiKey", "moonshotRegion"],
    fetchUsage: fetchMoonshotUsage,
  },
];
