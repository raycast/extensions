export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}
