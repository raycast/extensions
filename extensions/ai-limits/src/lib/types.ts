// The shared shapes every provider returns and the UI renders. Values are plain JSON (numbers, strings), so a result
// survives Raycast's cache unchanged.

export type ProviderId =
  "claude" | "codex" | "cursor" | "gemini" | "copilot" | "openrouter" | "zai" | "kimi" | "deepseek" | "moonshot";

// A rate limit that fills up and resets, such as Claude's 5-hour session or Codex's weekly limit.
export interface UsageWindow {
  // Short label shown in the list, such as "Session", "Weekly" or "Weekly (Opus)".
  label: string;
  // Percent of the limit used, 0 to 100.
  usedPercent: number;
  // When the window resets, in epoch milliseconds, or null when the provider doesn't say.
  resetsAt: number | null;
  // Optional extra line, such as "120 / 500 requests".
  detail?: string;
}

// Money or credits, such as an API balance or a monthly extra-usage cap.
export interface Balance {
  // Short label, such as "Balance", "Extra Usage" or "Credits".
  label: string;
  // The amount left, or the amount used when `limit` is set.
  amount: number;
  // ISO currency code ("USD", "CNY"), or "credits" for non-money units.
  currency: string;
  // When set, `amount` is what was used out of this limit.
  limit?: number;
  // When the balance or cap resets, in epoch milliseconds.
  resetsAt?: number | null;
}

export interface ProviderUsage {
  provider: ProviderId;
  // Plan name, such as "Max 5x", "Plus" or "Pro".
  plan?: string;
  // Account email or name, when the provider returns one.
  account?: string;
  windows: UsageWindow[];
  balances: Balance[];
  // Short notes worth showing, such as "Token expired, using claude.ai session".
  notes: string[];
  // Where the data came from, such as "Claude Code credentials" or "claude.ai session".
  source: string;
  // When the data was fetched, in epoch milliseconds.
  fetchedAt: number;
  // Set when macOS refused the Keychain read and the claude.ai session answered instead. The UI turns the Keychain setting
  // off, as it does for a failed refresh, so macOS isn't asked again on every refresh.
  keychainDenied?: true;
  // Set when a request answered 429 but this result still has data from the others. It is the time the provider allows
  // the next request, in epoch milliseconds, the same as ProviderError.retryAt.
  retryAt?: number;
}

// Where a credential's value came from. A value typed into the preferences wins over a saved one, so a hint can name the
// preference when that is what needs fixing, and the action that saved the value otherwise.
export type ValueSource = "preference" | "connection";

// User settings the providers read. Built from the Raycast preferences by the command, so providers and tests don't
// depend on the generated Preferences type.
export interface Settings {
  // The user chose Connect on Claude, which allows reading Claude Code's login from the macOS Keychain.
  claudeKeychain?: boolean;
  // The config folders the user's shell sets (CLAUDE_CONFIG_DIR and CODEX_HOME), saved by Connect. They are used before
  // the extension's own environment, since Raycast's environment rarely has them.
  claudeConfigDir?: string;
  codexHome?: string;
  claudeSessionKey?: string;
  claudeSessionKeySource?: ValueSource;
  cursorCookie?: string;
  cursorCookieSource?: ValueSource;
  githubToken?: string;
  // A GitHub token from signing in inside the extension. Used when githubToken is empty.
  githubOAuthToken?: string;
  openrouterApiKey?: string;
  openrouterApiKeySource?: ValueSource;
  zaiApiKey?: string;
  zaiApiKeySource?: ValueSource;
  zaiRegion?: "global" | "china";
  kimiApiKey?: string;
  kimiApiKeySource?: ValueSource;
  deepseekApiKey?: string;
  deepseekApiKeySource?: ValueSource;
  moonshotApiKey?: string;
  moonshotApiKeySource?: ValueSource;
  moonshotRegion?: "global" | "china";
}

export type ProviderErrorKind =
  // No credentials found. The UI shows the provider under "Not Connected" with `hint` as the steps to connect.
  | "not-connected"
  // Credentials were found but rejected or expired. `hint` says how to fix them.
  | "auth"
  // The provider answered with an error, or could not be reached.
  | "http"
  // The provider answered in a shape we don't understand.
  | "parse";

// Set on the errors the UI acts on beyond showing them. "keychain-denied" means macOS refused the Keychain read, so the
// UI turns the Keychain setting off instead of asking macOS again on every refresh. "account-unsupported" means Google
// doesn't serve the CLI's quota to this account, so the login is fine and signing in again can't change that.
export type ProviderErrorCode = "keychain-denied" | "account-unsupported";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly hint?: string,
    // The HTTP status, when the error came from a provider's answer.
    readonly status?: number,
    readonly code?: ProviderErrorCode,
    // When the provider allows the next request, in epoch milliseconds. Set on a 429, so the extension waits instead of
    // asking again on every open and refresh.
    readonly retryAt?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
