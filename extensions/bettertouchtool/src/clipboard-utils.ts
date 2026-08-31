import type { ClipboardManagerItem } from "bettertouchtool";

const defaultPreviewLength = 120;

export function getClipboardItemText(item: ClipboardManagerItem): string {
  if (typeof item.content === "string" && item.content.length > 0) return item.content;
  return "";
}

export function getClipboardItemTitle(item: ClipboardManagerItem, maxLength = defaultPreviewLength): string {
  const preview = (item.meta.previewText || getClipboardItemText(item)).replace(/\s+/g, " ").trim();
  if (!preview) return "Non-text clipboard item";
  return preview.length <= maxLength ? preview : `${preview.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function formatClipboardItemDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
