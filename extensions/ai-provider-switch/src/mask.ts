export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}****${suffix}`;
}
