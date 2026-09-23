export function getCurrentTimeISO(): string {
  return new Date().toISOString();
}

export type ClockFormatPreference = "system" | "12-hour" | "24-hour";

export function resolveTimeFormat(preference: ClockFormatPreference): string {
  if (preference === "12-hour") return "h:mm a";
  if (preference === "24-hour") return "HH:mm";

  const systemFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
  return systemFormat.hour12 === false || systemFormat.hourCycle?.startsWith("h2") ? "HH:mm" : "h:mm a";
}

export function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatDelta(diffMinutes: number, style: "clock" | "text" = "text"): string {
  if (diffMinutes === 0) return "same";

  const sign = diffMinutes > 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;

  if (minutes === 0) {
    return `${sign}${hours} hr${hours !== 1 ? "s" : ""}`;
  }

  if (style === "clock") {
    return `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
  }

  return `${sign}${hours}h ${minutes}m`;
}
