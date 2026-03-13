export const formatDate = (dateString: string, { includeTime } = { includeTime: true }) => {
  const date = new Date(dateString);
  let options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (includeTime) options = { ...options, hour: "numeric", minute: "numeric", hour12: true };
  return date.toLocaleString("en-US", options);
};

export const formatBytes = (bytes: number | undefined) => {
  if (!bytes) return "";
  const sizeInMB = (bytes / (1000 * 1000)).toFixed(2);
  return `${sizeInMB} MB`;
};
