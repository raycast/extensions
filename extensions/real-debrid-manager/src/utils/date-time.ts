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

const date_format_options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

type TimestampFormat = "date" | "date_time";

export const formatDateTime = (timestamp?: string, format?: TimestampFormat): string => {
  if (!timestamp) return "Unknown";
  const dateObj = new Date(timestamp);

  const format_options = format === "date" ? date_format_options : date_time_format_options;

  return new Intl.DateTimeFormat("en-US", format_options).format(dateObj);
};

export const getPremiumDaysRemaining = (dateString?: string): number | null => {
  if (!dateString) return null;
  const now = new Date();
  const expiryDate = new Date(dateString);
  const timeRemaining = expiryDate.getTime() - now.getTime();

  return Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
};
