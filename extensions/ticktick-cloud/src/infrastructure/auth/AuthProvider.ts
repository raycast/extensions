export type AuthTarget = "mcp" | "openapi";

export interface AuthProvider {
  readonly target: AuthTarget;
  getAccessToken(): Promise<string>;
  invalidate(): Promise<void>;
  accountCacheKey(): Promise<string>;
}
