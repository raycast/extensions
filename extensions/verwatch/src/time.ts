const formatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "short",
});

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function relative(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return "just now";
}
