export const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const AUTH_URL = "https://claude.com/cai/oauth/authorize";
export const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
export const PROFILE_URL = "https://api.anthropic.com/api/oauth/profile";
export const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
export const SETTINGS_URL = "https://claude.ai/settings/usage";

export const USER_AGENT = "claude-code/0.2.32";
export const OAUTH_BETA = "oauth-2025-04-20";
export const SCOPES =
  "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

export const STORAGE_KEY_TOKENS = "claude_oauth_tokens";
export const CACHE_KEY_USAGE = "usage";
export const CACHE_KEY_AUTH = "auth_state";
export const CACHE_NAMESPACE_MENU_BAR = "menu-bar-preferences";

export const CLAUDE_BRAND_COLOR = "#D97757";
export const TIER_COLORS = {
  green: "#30D158",
  orange: "#FF9F0A",
  red: "#FF453A",
} as const;
export const TRACK_COLOR = "#8E8E93";

export const DEFAULT_TIMEOUT_MS = 12_000;
export const LOGIN_TIMEOUT_MS = 120_000;

export const PLAN_MAP: Record<string, string> = {
  claude_pro: "pro",
  claude_team: "team",
  claude_enterprise: "enterprise",
  claude_max: "max",
};
