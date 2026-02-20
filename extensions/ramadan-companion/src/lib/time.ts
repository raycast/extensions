/**
 * Format a 24h time string ("HH:MM") into 12h or 24h display format.
 */
export function formatTime(time24: string, format: "12h" | "24h"): string {
  // Strip seconds if present (e.g. "05:21 (PKT)" → "05:21")
  const clean = time24.split(" ")[0].trim();
  if (format === "24h") return clean;

  const [h, m] = clean.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Given a time string from the API ("HH:MM") and a timezone identifier,
 * returns a human-readable countdown string like "3h 42m" or "Time has passed for today".
 */
export function getCountdown(timeStr: string, timezone: string): string {
  const clean = timeStr.split(" ")[0].trim();
  const [targetH, targetM] = clean.split(":").map(Number);

  // Get the current local time in the city's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const currentH = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const currentM = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const targetMinutes = targetH * 60 + targetM;
  const currentMinutes = currentH * 60 + currentM;
  const diff = targetMinutes - currentMinutes;

  if (diff <= 0) return "Time has passed for today";

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Returns a short description of the Hijri month name for display.
 */
export function getHijriMonthName(monthNumber: number): string {
  const months = [
    "Muharram",
    "Safar",
    "Rabi al-Awwal",
    "Rabi al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah",
  ];
  return months[monthNumber - 1] ?? "Unknown";
}

/**
 * Returns a boolean indicating if we are currently in Ramadan (Hijri month 9).
 */
export function isRamadan(hijriMonthNumber: number): boolean {
  return hijriMonthNumber === 9;
}
