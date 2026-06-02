export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-zA-Z]+;/g, "");
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(date, now)) {
    if (diffMins < 1) return "właśnie teraz";
    if (diffMins === 1) return "1 minutę temu";
    if (diffMins < 5) return `${diffMins} minuty temu`;
    if (diffMins < 60) return `${diffMins} minut temu`;
    if (diffHours === 1) return "godzinę temu";
    if (diffHours < 5) return `${diffHours} godziny temu`;
    return `${diffHours} godzin temu`;
  }

  if (sameDay(date, yesterday)) return "wczoraj";

  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
