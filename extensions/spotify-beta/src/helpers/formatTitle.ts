export function formatTitle(title: string, max: number, showEllipsis = true) {
  if (max === 0) {
    return "";
  }

  if (title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
}
