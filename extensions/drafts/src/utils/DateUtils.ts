export const formatDate = (dateString: number | null): string => {
  if (dateString === null) return "No Date";
  try {
    // seconds to milliseconds conversion
    const date = new Date(dateString * 1000);
    // not sure why, but the date seems to be 31 years in the past without this.
    date.setUTCFullYear(date.getUTCFullYear() + 31);

    return date.toISOString().slice(0, 10) + " at " + date.toLocaleTimeString().slice(0, 5);
  } catch {
    return dateString.toString();
  }
};

export const convertSqlDate = (dateNumber: number): Date => {
  // seconds to milliseconds conversion
  const date = new Date(dateNumber * 1000);
  // not sure why, but the date seems to be 31 years in the past without this.
  date.setUTCFullYear(date.getUTCFullYear() + 31);
  return date;
};
