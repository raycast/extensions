const date_time_format_options: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: true,
};

export const formatDateTime = (timestamp?: string): string => {
  if (!timestamp) return "Unknown";
  const dateObj = new Date(timestamp);

  return new Intl.DateTimeFormat("en-US", date_time_format_options).format(dateObj);
};
