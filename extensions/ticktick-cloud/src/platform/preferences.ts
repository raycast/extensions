export type AuthMode = "oauth" | "apiToken";

/**
 * This package targets Raycast for Windows only: remote authentication is
 * mandatory and OAuth is the default. Unknown stored values fall back to
 * OAuth rather than failing, because the preference dropdown constrains
 * every value Raycast can persist.
 */
export function resolveAuthMode(configured: string | undefined): AuthMode {
  return configured === "apiToken" ? "apiToken" : "oauth";
}
