export function getMissingScopeDetails(error: unknown): { needed?: string } | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { data, message } = error as { data?: { error?: unknown; needed?: unknown }; message?: unknown };
  if (data?.error !== "missing_scope" && !(typeof message === "string" && message.includes("missing_scope"))) {
    return undefined;
  }
  return { needed: typeof data?.needed === "string" ? data.needed : undefined };
}

export function canReauthorizeSlack(accessToken: string | undefined, hasOAuthTokens: boolean): boolean {
  // A configured personal token takes precedence over any OAuth tokens left from an earlier login.
  return !accessToken && hasOAuthTokens;
}
