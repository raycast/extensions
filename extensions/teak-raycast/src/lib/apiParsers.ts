import { isStringList, type TagSummary } from "teak-sdk";
import { RaycastApiError } from "./apiErrors";

export type { TagSummary } from "teak-sdk";

/** A card another card links to with `[[Title|teak:<id>]]`, or one linking to it. */
export interface RaycastCardLink {
  id: string;
  missing: boolean;
  title: string | null;
  type: string | null;
}

export interface RaycastLinkPrice {
  amount: number;
  currency: string | null;
}

export interface RaycastCard {
  aiSummary: string | null;
  aiTags: string[];
  aiTranscript?: string | null;
  appUrl: string | null;
  archivedAt?: number | null;
  /** Cards linking to this one; only on a single-card response. */
  backlinks?: RaycastCardLink[];
  colors?: Array<{ hex: string; name?: string }>;
  /** When the link was marked read, watched, bought or done. */
  completedAt?: number | null;
  content: string;
  createdAt: number;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl: string | null;
  folderIds?: string[];
  id: string;
  isArchived?: boolean;
  isDeleted?: boolean;
  isFavorited: boolean;
  isHidden?: boolean;
  linkAuthor?: string | null;
  linkCategory?: string | null;
  linkFacts?: Array<{ label: string; value: string }>;
  linkPreviewImageUrl: string | null;
  linkPrice?: RaycastLinkPrice | null;
  linkPublishedAt?: string | null;
  linkPublisher?: string | null;
  linkSiteName?: string | null;
  /** Cards this one links to; only on a single-card response. */
  links?: RaycastCardLink[];
  metadataDescription: string | null;
  metadataTitle: string | null;
  mimeType?: string | null;
  notes: string | null;
  /** When the card was last saved: `createdAt`, or later when its link was saved again. */
  savedAt?: number;
  screenshotUrl: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  type: string;
  updatedAt: number;
  url: string | null;
}

export interface TagsResponse {
  items: TagSummary[];
}

/** `pending` while Teak is still reading the card; `unavailable` for a card in Trash or not found. */
export type SimilarityStatus = "ok" | "pending" | "unavailable";

export interface CardsResponse {
  items: RaycastCard[];
  nextCursor: string | null;
  similarity?: SimilarityStatus;
  total: number;
}

export interface RaycastFolder {
  /** Null for a smart folder, whose cards are found when listed. */
  cardCount: number | null;
  color: string | null;
  id: string;
  kind: "manual" | "smart";
  name: string;
  query: string | null;
}

export interface FoldersResponse {
  items: RaycastFolder[];
}

export interface FolderCardsResult {
  failedIds: string[];
  folderLimitIds: string[];
  updatedIds: string[];
}

export interface RaycastTagOperation {
  changed: number;
  error: string | null;
  id: string;
  kind: "rename" | "merge" | "delete";
  status: "running" | "completed" | "failed";
  total: number;
}

export interface QuickSaveResponse {
  appUrl: string | null;
  card: RaycastCard | null;
  cardId: string;
  /** The link was already in Teak: that card moved to the top instead. */
  resaved?: true;
  status: "created";
  /** The re-saved card came back from Archive. */
  wasArchived?: true;
}

type JsonObject = Record<string, unknown>;

const QUICK_SAVE_STATUSES = ["created"] as const;
type QuickSaveStatus = (typeof QUICK_SAVE_STATUSES)[number];

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isRaycastCard = (value: unknown): value is RaycastCard => {
  if (!isJsonObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isNullableString(value.appUrl) &&
    typeof value.type === "string" &&
    typeof value.content === "string" &&
    isNullableString(value.notes) &&
    isNullableString(value.url) &&
    isStringList(value.tags) &&
    isStringList(value.aiTags) &&
    isNullableString(value.aiSummary) &&
    typeof value.isFavorited === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    isNullableString(value.fileUrl) &&
    isNullableString(value.thumbnailUrl) &&
    isNullableString(value.screenshotUrl) &&
    isNullableString(value.linkPreviewImageUrl) &&
    isNullableString(value.metadataTitle) &&
    isNullableString(value.metadataDescription)
  );
};

const optionalNullableString = (value: unknown): string | null | undefined =>
  isNullableString(value) ? value : undefined;

const optionalNullableNumber = (value: unknown): number | null | undefined =>
  typeof value === "number" || value === null ? value : undefined;

const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const isCardLink = (value: unknown): value is RaycastCardLink =>
  isJsonObject(value) &&
  typeof value.id === "string" &&
  typeof value.missing === "boolean" &&
  isNullableString(value.title) &&
  isNullableString(value.type);

const optionalCardLinks = (value: unknown): RaycastCardLink[] | undefined =>
  Array.isArray(value) ? value.filter(isCardLink) : undefined;

const optionalLinkPrice = (
  value: unknown,
): RaycastLinkPrice | null | undefined => {
  if (value === null) {
    return null;
  }
  return isJsonObject(value) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    isNullableString(value.currency)
    ? { amount: value.amount, currency: value.currency }
    : undefined;
};

// Newer fields are optional: a server that predates them, or a value of an
// unexpected shape, leaves them undefined instead of failing the whole card.
const withOptionalFields = (card: RaycastCard): RaycastCard => ({
  ...card,
  archivedAt: optionalNullableNumber(card.archivedAt),
  backlinks: optionalCardLinks(card.backlinks),
  completedAt: optionalNullableNumber(card.completedAt),
  folderIds: isStringList(card.folderIds) ? card.folderIds : undefined,
  isArchived: optionalBoolean(card.isArchived),
  isHidden: optionalBoolean(card.isHidden),
  linkAuthor: optionalNullableString(card.linkAuthor),
  linkCategory: optionalNullableString(card.linkCategory),
  linkPrice: optionalLinkPrice(card.linkPrice),
  linkPublishedAt: optionalNullableString(card.linkPublishedAt),
  linkPublisher: optionalNullableString(card.linkPublisher),
  linkSiteName: optionalNullableString(card.linkSiteName),
  links: optionalCardLinks(card.links),
  savedAt: typeof card.savedAt === "number" ? card.savedAt : undefined,
  sourceTitle: optionalNullableString(card.sourceTitle),
  sourceUrl: optionalNullableString(card.sourceUrl),
});

export const parseRaycastCard = (payload: unknown): RaycastCard => {
  if (!isRaycastCard(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  return withOptionalFields(payload);
};

export const parseCardsPageResponse = (payload: unknown): CardsResponse => {
  if (!isJsonObject(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const { items, pageInfo } = payload;

  if (
    !(
      Array.isArray(items) &&
      items.every((item) => isRaycastCard(item)) &&
      isJsonObject(pageInfo)
    )
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const { similarity } = payload;
  return {
    items: items.map(withOptionalFields),
    nextCursor:
      typeof pageInfo.nextCursor === "string" ? pageInfo.nextCursor : null,
    similarity:
      similarity === "ok" ||
      similarity === "pending" ||
      similarity === "unavailable"
        ? similarity
        : undefined,
    total: items.length,
  };
};

const isTagSummary = (value: unknown): value is TagSummary => {
  if (!isJsonObject(value)) {
    return false;
  }

  return typeof value.name === "string" && typeof value.count === "number";
};

export const parseTagsResponse = (payload: unknown): TagsResponse => {
  if (!isJsonObject(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const { items } = payload;

  if (!(Array.isArray(items) && items.every((item) => isTagSummary(item)))) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  return {
    items,
  };
};

const FOLDER_KINDS = ["manual", "smart"] as const;

const isFolder = (value: unknown): value is RaycastFolder =>
  isJsonObject(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  FOLDER_KINDS.includes(value.kind as RaycastFolder["kind"]) &&
  (typeof value.cardCount === "number" || value.cardCount === null) &&
  isNullableString(value.color) &&
  isNullableString(value.query);

export const parseFoldersResponse = (payload: unknown): FoldersResponse => {
  if (
    !(
      isJsonObject(payload) &&
      Array.isArray(payload.items) &&
      payload.items.every(isFolder)
    )
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  return { items: payload.items };
};

export const parseFolder = (payload: unknown): RaycastFolder => {
  if (!isFolder(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  return payload;
};

export const parseFolderCardsResult = (payload: unknown): FolderCardsResult => {
  if (
    !(
      isJsonObject(payload) &&
      isStringList(payload.failedIds) &&
      isStringList(payload.folderLimitIds) &&
      isStringList(payload.updatedIds)
    )
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  return {
    failedIds: payload.failedIds,
    folderLimitIds: payload.folderLimitIds,
    updatedIds: payload.updatedIds,
  };
};

const TAG_OPERATION_KINDS = ["rename", "merge", "delete"];
const TAG_OPERATION_STATUSES = ["running", "completed", "failed"];

export const parseTagOperation = (payload: unknown): RaycastTagOperation => {
  if (
    !(
      isJsonObject(payload) &&
      typeof payload.id === "string" &&
      TAG_OPERATION_KINDS.includes(payload.kind as string) &&
      TAG_OPERATION_STATUSES.includes(payload.status as string) &&
      typeof payload.changed === "number" &&
      typeof payload.total === "number"
    )
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  return {
    changed: payload.changed,
    error: typeof payload.error === "string" ? payload.error : null,
    id: payload.id,
    kind: payload.kind as RaycastTagOperation["kind"],
    status: payload.status as RaycastTagOperation["status"],
    total: payload.total,
  };
};

export const parseQuickSaveResponse = (payload: unknown): QuickSaveResponse => {
  if (!isJsonObject(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const { cardId, status } = payload;
  const hasKnownStatus =
    typeof status === "string" &&
    QUICK_SAVE_STATUSES.includes(status as QuickSaveStatus);

  const parseNullableCard = (
    value: unknown,
  ): RaycastCard | null | undefined => {
    if (value === undefined || value === null) {
      return null;
    }
    return isRaycastCard(value) ? withOptionalFields(value) : undefined;
  };
  const card = parseNullableCard(payload.card);
  const appUrl = isNullableString(payload.appUrl) ? payload.appUrl : undefined;

  if (
    typeof cardId !== "string" ||
    !hasKnownStatus ||
    card === undefined ||
    appUrl === undefined
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const resolvedStatus = status as QuickSaveStatus;

  return {
    appUrl,
    card,
    cardId,
    status: resolvedStatus,
    ...(payload.resaved === true ? { resaved: true as const } : {}),
    ...(payload.resaved === true && payload.wasArchived === true
      ? { wasArchived: true as const }
      : {}),
  };
};

export const parseToolCardId = (value: unknown): string => {
  const cardId = typeof value === "string" ? value.trim() : "";
  if (!cardId) {
    throw new Error("cardId is required");
  }
  return cardId;
};
