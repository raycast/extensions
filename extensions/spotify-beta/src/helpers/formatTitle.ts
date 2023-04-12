export function formatTitle(title: string, max: number, showEllipsis = true) {
  if (Number.isNaN(max) || max < 0 || title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
}
