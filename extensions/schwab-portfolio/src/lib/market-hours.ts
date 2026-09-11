/**
 * Simple market hours check for US equity markets.
 * Regular hours: 9:30 AM - 4:00 PM ET, Monday - Friday.
 * Does not account for holidays — a future improvement could use the Schwab market hours API.
 */
const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const weekdayNumbers: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getEasternTime(date: Date) {
  const parts = easternTimeFormatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return {
    day: weekdayNumbers[weekday ?? "Sun"],
    hours: Number(hour ?? 0),
    minutes: Number(minute ?? 0),
  };
}

export function isMarketOpen(): boolean {
  const { day, hours, minutes } = getEasternTime(new Date());
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;

  const timeInMinutes = hours * 60 + minutes;

  // Market open: 9:30 AM (570 min) to 4:00 PM (960 min)
  return timeInMinutes >= 570 && timeInMinutes < 960;
}

export function getMarketStatusText(): string {
  if (isMarketOpen()) {
    return "Market Open";
  }

  const { day, hours, minutes } = getEasternTime(new Date());

  if (day === 0 || day === 6) {
    return "Market Closed (Weekend)";
  }

  const timeInMinutes = hours * 60 + minutes;

  if (timeInMinutes < 570) {
    return "Pre-Market";
  }

  return "Market Closed";
}
