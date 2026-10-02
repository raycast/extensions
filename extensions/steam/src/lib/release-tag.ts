import { Color, List } from "@raycast/api";

export function releaseTag(date?: string): List.Item.Accessory | undefined {
  if (!date) return undefined;
  const year = Number(date.match(/\b(?:19|20)\d{2}\b/)?.[0]);
  if (year === new Date().getFullYear()) {
    const withoutYear = date.replace(/,?\s*\b\d{4}\b/, "").trim();
    return { tag: { value: withoutYear || String(year), color: Color.Magenta }, tooltip: date };
  }
  return { tag: { value: year ? String(year) : date, color: Color.SecondaryText }, tooltip: date };
}
