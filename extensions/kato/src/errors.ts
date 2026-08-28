export function messageForStatus(
  status: number,
  code: string | undefined,
  fallback: string,
): string {
  if (status === 401)
    return "Your Kato connection expired. Reconnect to continue.";
  if (status === 403) return "Kato denied access to this item or workspace.";
  if (status === 429)
    return "Kato is receiving too many requests. Try again shortly.";
  if (code === "WORKSPACE_MEMBER_LIMIT_EXCEEDED")
    return "This Kato workspace is currently locked.";
  return fallback || `Kato request failed (${status})`;
}
