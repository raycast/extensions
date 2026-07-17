export function formattedDate(date: number): string {
  return new Date(date)
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(",", "")
    .replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2");
}
