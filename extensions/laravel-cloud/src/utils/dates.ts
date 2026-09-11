export function timeAgo(dateString: string | null): string {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m}m ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h}h ago`;
  }
  if (seconds < 604800) {
    const d = Math.floor(seconds / 86400);
    return `${d}d ago`;
  }

  return formatDate(dateString);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTimeRangeFrom(range: string): string {
  const now = new Date();
  switch (range) {
    case "15m":
      now.setMinutes(now.getMinutes() - 15);
      break;
    case "1h":
      now.setHours(now.getHours() - 1);
      break;
    case "6h":
      now.setHours(now.getHours() - 6);
      break;
    case "24h":
      now.setHours(now.getHours() - 24);
      break;
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    default:
      now.setHours(now.getHours() - 1);
  }
  return now.toISOString();
}
