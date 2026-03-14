export function buildAuthHeader(username?: string, password?: string): string | undefined {
  if (!username || !password) {
    return undefined;
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
