export function formatRelativeDate(timestamp: number): string {
  const now = new Date();
  const alertTime = new Date(timestamp * 1000);
  const differenceInMinutes = (now.getTime() - alertTime.getTime()) / 60_000;

  if (differenceInMinutes < 1) return "Just now";
  if (differenceInMinutes === 1) return "1 minute ago";
  if (differenceInMinutes < 60) return `${Math.floor(differenceInMinutes)} minutes ago`;
  if (differenceInMinutes === 60) return `1 hour ago`;
  if (differenceInMinutes < 1440) return `${Math.floor(differenceInMinutes / 60)} hours ago`;

  if (differenceInMinutes <= 8640) {
    // 6 days in minutes
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(alertTime);
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(alertTime);
}
