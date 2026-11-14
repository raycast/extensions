import { Temporal } from "@js-temporal/polyfill";

// Morgen returns wall-clock start values with a separate IANA timeZone.
// Preserve explicit offsets; interpret floating values in the local zone.
export function eventDate(isoString: string, timeZone?: string | null): Date {
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(isoString)) {
    return new Date(Temporal.Instant.from(isoString).epochMilliseconds);
  }
  const zoned = Temporal.PlainDateTime.from(isoString).toZonedDateTime(
    timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    { disambiguation: "compatible" },
  );
  return new Date(zoned.epochMilliseconds);
}

export function formatTime(isoString: string, timeZone?: string | null): string {
  const date = eventDate(isoString, timeZone);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(isoString: string, timeZone?: string | null): string {
  const date = eventDate(isoString, timeZone);
  const dateStr = date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

export function computeDuration(start: string, end?: string, duration?: string, timeZone?: string | null): string {
  let minutes: number | undefined;
  if (duration) {
    const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (match) {
      const h = parseInt(match[1] ?? "0", 10);
      const m = parseInt(match[2] ?? "0", 10);
      minutes = h * 60 + m;
    }
  } else if (end) {
    const ms = eventDate(end, timeZone).getTime() - eventDate(start, timeZone).getTime();
    minutes = Math.round(ms / 60000);
  }
  if (minutes === undefined || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}
