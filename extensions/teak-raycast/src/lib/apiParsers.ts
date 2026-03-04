import { RaycastApiError } from "./apiErrors";

export type RaycastCard = {
  id: string;
  type: string;
  content: string;
  notes: string | null;
  url: string | null;
  tags: string[];
  aiTags: string[];
  aiSummary: string | null;
  isFavorited: boolean;
  createdAt: number;
  updatedAt: number;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  screenshotUrl: string | null;
  linkPreviewImageUrl: string | null;
  metadataTitle: string | null;
  metadataDescription: string | null;
};

export type CardsResponse = {
  items: RaycastCard[];
  total: number;
};

export type QuickSaveResponse = {
  status: "created" | "duplicate";
  cardId: string;
};

type JsonObject = Record<string, unknown>;

const QUICK_SAVE_STATUSES = ["created", "duplicate"] as const;
type QuickSaveStatus = (typeof QUICK_SAVE_STATUSES)[number];

const isJsonObject = (value: unknown): value is JsonObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNullableString = (value: unknown): value is string | null => {
  return typeof value === "string" || value === null;
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
};

const isRaycastCard = (value: unknown): value is RaycastCard => {
  if (!isJsonObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.content === "string" &&
    isNullableString(value.notes) &&
    isNullableString(value.url) &&
    isStringArray(value.tags) &&
    isStringArray(value.aiTags) &&
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

export const getPayloadCode = (payload: unknown): string | undefined => {
  if (!isJsonObject(payload)) {
    return undefined;
  }

  return typeof payload.code === "string" ? payload.code : undefined;
};

export const parseCardsResponse = (payload: unknown): CardsResponse => {
  if (!isJsonObject(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const { items, total } = payload;

  if (
    !Array.isArray(items) ||
    !items.every((item) => isRaycastCard(item)) ||
    typeof total !== "number"
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  return {
    items,
    total,
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

  if (typeof cardId !== "string" || !hasKnownStatus) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  const resolvedStatus = status as QuickSaveStatus;

  return {
    cardId,
    status: resolvedStatus,
  };
};
