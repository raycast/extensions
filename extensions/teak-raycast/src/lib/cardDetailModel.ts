import type { RaycastCard } from "./api";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const firstMeaningfulLine = (value: string): string | null => {
  for (const line of value.split("\n")) {
    const normalized = normalizeWhitespace(line);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const withMaxLength = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
};

const fallbackTitle = (card: RaycastCard): string => {
  const suffix = card.id.slice(-6);
  return `${card.type.toUpperCase()} Card • ${suffix}`;
};

export const getCardTitle = (card: RaycastCard, maxLength = 88): string => {
  const metadataTitle = normalizeWhitespace(card.metadataTitle ?? "");
  if (metadataTitle) {
    return withMaxLength(metadataTitle, maxLength);
  }

  const fromContent = firstMeaningfulLine(card.content);
  if (fromContent) {
    return withMaxLength(fromContent, maxLength);
  }

  return fallbackTitle(card);
};

export const isHttpUrl = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const getOpenableUrl = (card: RaycastCard): string | null => {
  return isHttpUrl(card.url) ? card.url : null;
};

const isRenderableImageUrl = (value: string | null | undefined): boolean => {
  if (!(value && isHttpUrl(value))) {
    return false;
  }

  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.toLowerCase();
    return Array.from(IMAGE_EXTENSIONS).some((extension) =>
      pathname.endsWith(extension),
    );
  } catch {
    return false;
  }
};

export const getHeroMediaUrl = (card: RaycastCard): string | null => {
  const candidates: Array<string | null | undefined> = [
    card.screenshotUrl,
    card.thumbnailUrl,
    card.linkPreviewImageUrl,
    isRenderableImageUrl(card.fileUrl) ? card.fileUrl : null,
  ];

  for (const candidate of candidates) {
    if (candidate && isHttpUrl(candidate)) {
      return candidate;
    }
  }

  return null;
};

export type DetailStatusChip = {
  kind: "type" | "favorite" | "aiSummary" | "aiTags";
  text: string;
};

export const getDetailStatusChips = (card: RaycastCard): DetailStatusChip[] => {
  return [
    {
      kind: "type",
      text: card.type,
    },
    {
      kind: "favorite",
      text: card.isFavorited ? "Favorited" : "Not Favorited",
    },
    {
      kind: "aiSummary",
      text: card.aiSummary ? "Teak Summary" : "No Teak Summary",
    },
    {
      kind: "aiTags",
      text: card.aiTags.length > 0 ? "Teak Tags" : "No Teak Tags",
    },
  ];
};
