import type { RaycastCard, RaycastLinkPrice } from "./api";
import {
  backlinksMarkdown,
  cardLinksToText,
  renderCardLinks,
} from "./cardLinks";
import { getTeakCardUrl } from "./constants";
import { doneStatusLabel, isDone } from "./doneStates";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

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

const fallbackTitle = (card: RaycastCard): string =>
  `${card.type.toUpperCase()} Card`;

export const getCardTitle = (card: RaycastCard, maxLength = 88): string => {
  const metadataTitle = normalizeWhitespace(card.metadataTitle ?? "");
  if (metadataTitle) {
    return withMaxLength(metadataTitle, maxLength);
  }

  const fromContent = firstMeaningfulLine(cardLinksToText(card.content));
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

export const getOpenableUrl = (card: RaycastCard): string | null =>
  isHttpUrl(card.url) ? card.url : null;

export const getCardDomain = (card: RaycastCard): string | null => {
  const url = getOpenableUrl(card);
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export const getTeakUrl = (card: RaycastCard): string =>
  card.appUrl ?? getTeakCardUrl(card.id);

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

export interface DetailStatusChip {
  kind:
    | "type"
    | "favorite"
    | "aiSummary"
    | "aiTags"
    | "done"
    | "archived"
    | "hidden";
  text: string;
}

export const getDetailStatusChips = (card: RaycastCard): DetailStatusChip[] => [
  {
    kind: "type",
    text: card.type,
  },
  {
    kind: "favorite",
    text: card.isFavorited ? "Favorited" : "Not Favorited",
  },
  ...(isDone(card)
    ? [{ kind: "done" as const, text: doneStatusLabel(card) }]
    : []),
  ...(card.isArchived ? [{ kind: "archived" as const, text: "Archived" }] : []),
  ...(card.isHidden ? [{ kind: "hidden" as const, text: "Hidden" }] : []),
  {
    kind: "aiSummary",
    text: card.aiSummary ? "Teak Summary" : "No Teak Summary",
  },
  {
    kind: "aiTags",
    text: card.aiTags.length > 0 ? "Teak Tags" : "No Teak Tags",
  },
];

/** "USD 29.99" style price, in the page's currency when it has one. */
export const formatLinkPrice = (price: RaycastLinkPrice): string => {
  if (price.currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        currency: price.currency,
        style: "currency",
      }).format(price.amount);
    } catch {
      return `${price.currency} ${price.amount}`;
    }
  }
  return String(price.amount);
};

/** `design_portfolio` as "Design portfolio". */
export const formatLinkCategory = (category: string): string => {
  const words = category.replace(/_/g, " ").trim();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** The author and publisher of a link, such as "Ada Lovelace · The Atlas". */
export const getLinkByline = (card: RaycastCard): string | null => {
  const parts = [
    card.linkAuthor,
    card.linkPublisher || card.linkSiteName,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? Array.from(new Set(parts)).join(" · ") : null;
};

/** The page a link was published on, as a date; null when it isn't a date. */
export const getLinkPublishedDate = (card: RaycastCard): Date | null => {
  if (!card.linkPublishedAt) {
    return null;
  }
  const date = new Date(card.linkPublishedAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** The page a saved text or quote came from: `From example.com`. */
export const getCardSource = (
  card: RaycastCard,
): { label: string; title: string | null; url: string } | null => {
  if (!isHttpUrl(card.sourceUrl)) {
    return null;
  }
  const url = card.sourceUrl as string;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return {
      label: `From ${host}`,
      title: card.sourceTitle?.trim() || null,
      url,
    };
  } catch {
    return null;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
};

// Raycast can't play media or preview documents, so the detail shows what it
// can render: the image, the text, palette swatches, and the transcript.
const SWATCH_SIZE = 56;
const SWATCH_GAP = 8;

const paletteMarkdown = (hexes: string[]): string => {
  const width = hexes.length * (SWATCH_SIZE + SWATCH_GAP) - SWATCH_GAP;
  const rects = hexes
    .map(
      (hex, index) =>
        `<rect x="${index * (SWATCH_SIZE + SWATCH_GAP)}" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" rx="10" fill="${hex}"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${SWATCH_SIZE}">${rects}</svg>`;
  return `![${hexes.join(" ")}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
};

const SAFE_HEX = /^#[0-9a-f]{3,8}$/i;

export const getDetailMarkdown = (card: RaycastCard): string => {
  const heroMediaUrl = getHeroMediaUrl(card);
  const swatches = (card.colors ?? [])
    .map((color) => color.hex)
    .filter((hex) => SAFE_HEX.test(hex));
  const isFileCard = Boolean(card.fileName);
  const content = renderCardLinks(card.content.trim(), card.links);
  const sections = [
    `# ${getCardTitle(card)}`,
    heroMediaUrl ? `![](${heroMediaUrl})` : "",
    card.type === "palette" && swatches.length > 0
      ? paletteMarkdown(swatches)
      : "",
    content && !(isFileCard && content === card.fileName)
      ? `## Content\n\n${card.type === "quote" ? `> ${content}` : content}`
      : "",
    card.notes ? `## Notes\n\n${card.notes}` : "",
    card.aiSummary ? `## Teak Summary\n\n${card.aiSummary}` : "",
    card.aiTranscript ? `## Transcript\n\n${card.aiTranscript}` : "",
    backlinksMarkdown(card.backlinks ?? []),
  ];
  return sections.filter(Boolean).join("\n\n");
};
