import { RaycastApiError } from "./apiErrors";

export interface RaycastCard {
  aiSummary: string | null;
  aiTags: string[];
  appUrl: string | null;
  content: string;
  createdAt: number;
  fileUrl: string | null;
  id: string;
  isFavorited: boolean;
  linkPreviewImageUrl: string | null;
  metadataDescription: string | null;
  metadataTitle: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  type: string;
  updatedAt: number;
  url: string | null;
}

export interface TagSummary {
  count: number;
  name: string;
}

export interface TagsResponse {
  items: TagSummary[];
}

export interface CardsResponse {
  items: RaycastCard[];
  total: number;
}

export interface QuickSaveResponse {
  appUrl: string | null;
  card: RaycastCard | null;
  cardId: string;
  status: "created";
}

type JsonObject = Record<string, unknown>;

const QUICK_SAVE_STATUSES = ["created"] as const;
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
    isNullableString(value.appUrl) &&
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

export const parseRaycastCard = (payload: unknown): RaycastCard => {
  if (!isRaycastCard(payload)) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  return payload;
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
    !(Array.isArray(items) && items.every((item) => isRaycastCard(item))) ||
    typeof total !== "number"
  ) {
    throw new RaycastApiError("REQUEST_FAILED");
  }

  return {
    items,
    total,
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
    return isRaycastCard(value) ? value : undefined;
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
  };
};
