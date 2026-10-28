const MINUTES_PER_HOUR = 60;
export function formatHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const roundedMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / MINUTES_PER_HOUR);
  const remainingMinutes = roundedMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${remainingMinutes}m`;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}
