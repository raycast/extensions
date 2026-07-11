// Format large numbers with K/M suffixes
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  if (num >= 1000000) {
    const val = num / 1000000;
    return `${val.toFixed(1).replace(/\.0$/, "")}M`;
  } else if (num >= 100000) {
    // For 100K+, round to nearest K to keep it short
    return `${Math.round(num / 1000)}K`;
  } else if (num >= 1000) {
    const val = num / 1000;
    return `${val.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return num.toString();
}

// Format date as DD.MM.YYYY (using UTC to avoid timezone issues)
export function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return `${date.getUTCDate().toString().padStart(2, "0")}.${(date.getUTCMonth() + 1).toString().padStart(2, "0")}.${date.getUTCFullYear()}`;
}

// Get freshness label based on months since update
export function getFreshnessLabel(dateStr?: string): string | null {
  if (!dateStr) return null;
  const monthsDiff = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsDiff <= 3) return "Updated<3M";
  if (monthsDiff <= 6) return "Updated>3M";
  return "Updated>6M";
}

// Extract author from GitHub URL or server name
export function extractAuthor(repoUrl?: string, serverName?: string): string | null {
  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^/]+)/);
    if (match) return match[1];
  }
  if (serverName) {
    const nameMatch = serverName.match(/(?:\.pulsemcp\.mirror\/)?([^/]+)/);
    if (nameMatch) return nameMatch[1];
  }
  return null;
}

// Get author GitHub URL
export function getAuthorUrl(repoUrl?: string, serverName?: string): string | null {
  const author = extractAuthor(repoUrl, serverName);
  if (author) return `https://github.com/${author}`;
  return null;
}

// Shorten transport type names for display
export function shortenTransport(transport: string): string {
  const lower = transport.toLowerCase();
  if (lower === "streamable-http" || lower === "sse") return "HTTP";
  return transport;
}
