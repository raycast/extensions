export const formatDate = (date: string) =>
  new Date(date)
    .toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", ""); // 19/10/2025 16:11:11
