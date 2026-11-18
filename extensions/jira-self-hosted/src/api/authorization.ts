export function getAuthorizationHeader(authType: "basic" | "bearer", token: string, username?: string): string {
  if (authType === "bearer") return `Bearer ${token}`;

  const normalizedUsername = username?.trim();
  if (!normalizedUsername) throw new Error("Username is required for Basic authentication.");

  return `Basic ${Buffer.from(`${normalizedUsername}:${token}`).toString("base64")}`;
}
