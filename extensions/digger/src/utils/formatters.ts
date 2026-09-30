/**
 * Shared formatting utilities for Digger components
 */

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };

  return statusTexts[code] || "Unknown";
}

export function formatDate(dateString: string, monthFormat: "short" | "long" = "short"): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: monthFormat,
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format large numbers compactly (1K, 5.7M, etc.)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    // Show one decimal if < 10M, otherwise round
    return millions < 10 ? `${millions.toFixed(1)}M` : `${Math.round(millions)}M`;
  }
  if (num >= 1_000) {
    const thousands = num / 1_000;
    // Show one decimal if < 10K, otherwise round
    return thousands < 10 ? `${thousands.toFixed(1)}K` : `${Math.round(thousands)}K`;
  }
  return num.toLocaleString();
}
