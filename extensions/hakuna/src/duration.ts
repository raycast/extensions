export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

export function formatDuration(
  totalSeconds: number,
  durationFormat: string,
): string {
  if (durationFormat === "decimal") {
    return `${(totalSeconds / 3600).toFixed(2)} h`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatOvertime(
  seconds: number,
  durationFormat: string,
): string {
  const sign = seconds < 0 ? "−" : "";
  return sign + formatDuration(Math.abs(seconds), durationFormat);
}
