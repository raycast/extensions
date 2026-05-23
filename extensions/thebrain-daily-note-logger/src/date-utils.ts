const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
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

export function todayStrings(date: Date = new Date()): {
  year: string;
  month: string;
  day: string;
} {
  const d = date;
  const year = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const month = `${mm}-${MONTHS[d.getMonth()]}`;
  const day = `${year}-${mm}-${dd} ${DAYS[d.getDay()]}`;
  return { year, month, day };
}

export function currentTimestamp(date: Date = new Date()): string {
  const d = date;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}
