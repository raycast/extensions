import type { MediaItem, StreamVariant, VideoVariant, AudioVariant } from "./types";

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatCost(cost: number): string {
  return cost === 1 ? "1 credit" : `${cost} credits`;
}

export function variantTitle(_item: MediaItem, variant: VideoVariant | AudioVariant): string {
  return variant.quality;
}

export function variantSubtitle(variant: VideoVariant | AudioVariant): string {
  const parts: string[] = [];
  if (variant.container) parts.push(variant.container.toUpperCase());
  if (variant.size) parts.push(formatBytes(variant.size));
  return parts.join(" · ");
}

export function mediaItemLabel(item: MediaItem, index: number, total: number): string {
  const prefix = total > 1 ? `${index + 1}. ` : "";
  switch (item.type) {
    case "video":
      return `${prefix}Video`;
    case "audio":
      return `${prefix}Audio`;
    case "image":
      return `${prefix}Image`;
  }
}

export function pickBestStreamVariant(variants: StreamVariant[]): StreamVariant | undefined {
  if (variants.length === 0) return undefined;
  return variants.reduce((best, v) => (v.cost >= best.cost ? v : best), variants[0]);
}

export function isUrl(text: string): boolean {
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
