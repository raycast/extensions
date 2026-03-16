// OpenAI OAuth + API constants (matching Codex CLI)
// Note: OAuth requires a ChatGPT Plus or Pro account.
//
// This extension reuses the Codex CLI's public OAuth client ID and the ChatGPT
// Codex backend API, allowing grammar checking using an existing ChatGPT Plus
// or Pro subscription without separate API credits.

// Public OAuth client ID from the open-source Codex CLI
// This is a PKCE public client with no client secret
// Used for initial OAuth login and token refresh flows
// Source: https://github.com/openai/codex/blob/49edf311ac3ae84659b0ec5eacd5e471c881eee8/codex-rs/core/src/auth.rs#L744
export const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const OPENAI_AUTH_BASE = "https://auth.openai.com";
export const OPENAI_AUTHORIZE_URL = `${OPENAI_AUTH_BASE}/oauth/authorize`;
export const OPENAI_TOKEN_URL = `${OPENAI_AUTH_BASE}/oauth/token`;
export const OPENAI_SCOPE = "openid profile email offline_access";

export const OPENAI_REDIRECT_PORT = 1455;
// Codex CLI uses "localhost" NOT "127.0.0.1" - OAuth validates exact string match
export const OPENAI_REDIRECT_URI = `http://localhost:${OPENAI_REDIRECT_PORT}/auth/callback`;

export const OPENAI_STORAGE_KEY = "openai_oauth_tokens";

// ChatGPT Codex backend endpoint
export const CHATGPT_API_URL = "https://chatgpt.com/backend-api/codex/responses";
