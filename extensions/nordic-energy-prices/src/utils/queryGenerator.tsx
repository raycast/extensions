export function generateUrl(date: Date, url: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return url
    .replace("[YEAR]", year.toString())
    .replace("[MONTH]", month.toString().padStart(2, "0"))
    .replace("[DAY]", day.toString().padStart(2, "0"));
}
