export function timeAgo(date: string) {
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
  };

  const secondsElapsed = (new Date(date).getTime() - Date.now()) / 1000;

  for (const [unit, range] of Object.entries(ranges)) {
    if (range < Math.abs(secondsElapsed)) {
      return formatter.format(Math.round(secondsElapsed / range), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "Just now";
}
