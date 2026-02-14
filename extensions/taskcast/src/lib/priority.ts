export type Priority = "high" | "medium" | "low" | undefined;

export function applyPriority(rawTitle: string): string {
  const title = rawTitle.trim();

  if (/(^|\s)(!!!|!high)\b/i.test(title)) {
    return "🔴 " + title.replace(/(!!!|!high)/gi, "").trim();
  }

  if (/(^|\s)(!!|!medium)\b/i.test(title)) {
    return "🟡 " + title.replace(/(!!|!medium)/gi, "").trim();
  }

  if (/(^|\s)(!|!low)\b/i.test(title)) {
    return "🔵 " + title.replace(/(!low|\s!)/gi, "").trim();
  }

  return title;
}

export function priorityRank(title: string): number {
  if (title.startsWith("🔴")) return 0;
  if (title.startsWith("🟡")) return 1;
  if (title.startsWith("🔵")) return 2;
  return 3;
}
