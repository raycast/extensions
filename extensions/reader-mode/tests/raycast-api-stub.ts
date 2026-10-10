/**
 * Stand-in for `@raycast/api` so the parsing and detection code can be exercised outside
 * of Raycast. The extension's pure logic — fetching, cleaning, parsing, paywall detection —
 * does not need the host; only the UI layer does, and this suite does not test the UI.
 */

export const environment = {
  canAccess: () => false,
  isDevelopment: false,
  appearance: "dark" as const,
};

export const BrowserExtension = {
  getTabs: async () => [],
  getContent: async () => "",
};

export const Clipboard = {
  readText: async () => undefined,
  copy: async () => {},
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
};

export const AI = {
  Model: {
    "OpenAI_GPT-5.4_nano": "openai-gpt-5.4-nano",
    "OpenAI_GPT-5.5_Instant": "openai-gpt-5.5-instant",
    "OpenAI_GPT-5.4_mini": "openai-gpt-5.4-mini",
    "OpenAI_GPT-6_Luna": "openai-gpt-6-luna",
    "Anthropic_Claude_Haiku_4.5": "anthropic-claude-4-5-haiku",
    "Anthropic_Claude_Sonnet_5.5": "anthropic-claude-sonnet-5-5",
    "Google_Gemini_3.8_Flash": "google-gemini-3.8-flash",
    "Google_Gemini_3.1_Pro": "google-gemini-3.1-pro",
    "xAI_Grok-4.7": "xai-grok-4.7",
  },
};

export const Keyboard = {
  Shortcut: { Common: { Copy: {}, Open: {}, Save: {}, Refresh: {} } },
};

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};

export async function showToast() {
  return { hide: () => {} };
}

/** Mutable so a test can set a preference; reset it in the same test. */
export const stubPreferences: Record<string, unknown> = {
  skipPreCheck: true,
  enablePaywallHopper: true,
  showArticleImage: true,
  verboseLogging: false,
};

export function getPreferenceValues() {
  return stubPreferences;
}

export async function getSelectedText(): Promise<string> {
  throw new Error("no selection");
}
