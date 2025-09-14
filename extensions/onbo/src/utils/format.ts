export function formatDaysAgo(days: number): string {
  if (!Number.isFinite(days)) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function formatAppliedDate(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString();
}

export const formatLocationsString = (locations?: string[]) => {
  if (!locations || locations.length === 0) return "Location TBD";
  if (locations.length === 1) return locations[0];
  if (locations.length === 2) return `${locations[0].split(",")[0]}, ${locations[1].split(",")[0]}`;
  return `${locations[0].split(",")[0]} +${locations.length - 1} more`;
};
