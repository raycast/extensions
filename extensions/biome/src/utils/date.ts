export function formatDate(
  timestamp: number | string | undefined,
  format: "short" | "long" = "short",
): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return format === "short" ? date.toLocaleDateString() : date.toLocaleString();
}

export function formatReleaseDate(release: {
  published_at?: string;
  created_at?: string;
}): string {
  return formatDate(release.published_at || release.created_at);
}
