export function formatResultCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
