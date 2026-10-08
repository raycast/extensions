export function formatURLHost(
  rawURL: string | null | undefined,
): string | undefined {
  if (!rawURL) {
    return undefined;
  }

  try {
    return new URL(rawURL).host || undefined;
  } catch {
    return undefined;
  }
}

export function formatURLHosts(
  rawURLs: Array<string | null | undefined>,
): string | undefined {
  const hosts = rawURLs
    .map(formatURLHost)
    .filter((host): host is string => Boolean(host));
  return hosts.length > 0 ? hosts.join(" • ") : undefined;
}
