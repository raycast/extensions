const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(fmt: string, now: Date = new Date()): string {
  // Pre-translate human-friendly tokens to strftime.
  // Longer patterns first: YYYY before YY, MM before mm, DD before dd.
  const resolved = fmt
    .replace(/YYYY/g, "%Y")
    .replace(/YY/g, "%y")
    .replace(/MM/g, "%m")
    .replace(/DD/g, "%d")
    .replace(/HH/g, "%H")
    .replace(/mm/g, "%M")
    .replace(/ss/g, "%S");

  return resolved
    .replace(/%Y/g, String(now.getFullYear()))
    .replace(/%y/g, String(now.getFullYear()).slice(-2))
    .replace(/%B/g, MONTHS_LONG[now.getMonth()])
    .replace(/%b/g, MONTHS_SHORT[now.getMonth()])
    .replace(/%A/g, DAYS_LONG[now.getDay()])
    .replace(/%a/g, DAYS_SHORT[now.getDay()])
    .replace(/%m/g, pad(now.getMonth() + 1))
    .replace(/%-d/g, String(now.getDate())) // unpadded day (%-d); kept before %d for clarity
    .replace(/%d/g, pad(now.getDate()))
    .replace(/%H/g, pad(now.getHours()))
    .replace(/%M/g, pad(now.getMinutes()))
    .replace(/%S/g, pad(now.getSeconds()));
}
