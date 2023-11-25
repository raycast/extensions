const dateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(date: Date) {
  return date.toLocaleString("en-GB", dateOptions);
}
