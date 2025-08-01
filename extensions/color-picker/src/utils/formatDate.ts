/**
 * Formats ISO date string to DD/MM/YYYY HH:MM display format.
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1); // getMonth() is 0-indexed
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
