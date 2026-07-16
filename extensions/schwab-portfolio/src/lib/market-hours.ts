/**
 * Simple market hours check for US equity markets.
 * Regular hours: 9:30 AM - 4:00 PM ET, Monday - Friday.
 * Does not account for holidays — a future improvement could use the Schwab market hours API.
 */
export function isMarketOpen(): boolean {
  const now = new Date();

  // Convert to ET (Eastern Time)
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);

  const day = et.getDay();
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;

  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Market open: 9:30 AM (570 min) to 4:00 PM (960 min)
  return timeInMinutes >= 570 && timeInMinutes < 960;
}

export function getMarketStatusText(): string {
  if (isMarketOpen()) {
    return "Market Open";
  }

  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);
  const day = et.getDay();

  if (day === 0 || day === 6) {
    return "Market Closed (Weekend)";
  }

  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (timeInMinutes < 570) {
    return "Pre-Market";
  }

  return "Market Closed";
}
