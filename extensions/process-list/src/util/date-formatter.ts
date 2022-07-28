const locale = Intl.DateTimeFormat().resolvedOptions().locale;
export const dateFormatter = new Intl.DateTimeFormat(locale, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: true,
});
