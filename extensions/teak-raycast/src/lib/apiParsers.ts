import type {
  Card,
  CardLinkRef,
  CardListItem,
  CardsPage,
  CreateCardResponse,
  Folder,
  FolderCardsResult,
  TagOperation,
  TagSummary,
} from "teak-sdk";
import { RaycastApiError } from "./apiErrors";

export type { FolderCardsResult, TagSummary } from "teak-sdk";

export type RaycastCardLink = CardLinkRef;
export type RaycastLinkPrice = NonNullable<Card["linkPrice"]>;

/** The fields every card view reads; a list asks for them with its includes. */
type ViewField = Extract<
  keyof Card,
  | "aiSummary"
  | "aiTags"
  | "content"
  | "createdAt"
  | "fileUrl"
  | "id"
  | "isFavorited"
  | "linkPreviewImageUrl"
  | "metadataDescription"
  | "metadataTitle"
  | "notes"
  | "screenshotUrl"
  | "tags"
  | "thumbnailUrl"
  | "type"
  | "updatedAt"
  | "url"
>;

/** Fields newer servers send; a card from an older one leaves them out. */
type NewerField =
  | "aiTranscript"
  | "archivedAt"
  | "backlinks"
  | "colors"
  | "completedAt"
  | "fileName"
  | "fileSize"
  | "folderIds"
  | "isArchived"
  | "isDeleted"
  | "isHidden"
  | "linkAuthor"
  | "linkCategory"
  | "linkFacts"
  | "linkPrice"
  | "linkPublishedAt"
  | "linkPublisher"
  | "linkSiteName"
  | "links"
  | "mimeType"
  | "savedAt"
  | "sourceTitle"
  | "sourceUrl";

/** A card as Raycast shows it: the SDK's card, with what the views read. */
export type RaycastCard = Pick<Card, ViewField> &
  Partial<Pick<Card, NewerField>> & { appUrl: string | null };

export interface TagsResponse {
  items: TagSummary[];
}

export type SimilarityStatus = NonNullable<CardsPage["similarity"]>;

export interface CardsResponse {
  items: RaycastCard[];
  nextCursor: string | null;
  similarity?: SimilarityStatus;
  total: number;
}

export type RaycastFolder = Pick<
  Folder,
  "cardCount" | "color" | "id" | "kind" | "name" | "query"
>;

export interface FoldersResponse {
  items: RaycastFolder[];
}

export type RaycastTagOperation = Pick<
  TagOperation,
  "changed" | "error" | "id" | "kind" | "status" | "total"
>;

export type QuickSaveResponse = Omit<CreateCardResponse, "appUrl" | "card"> & {
  appUrl: string | null;
  card: RaycastCard | null;
};

const SIMILARITY_STATUSES: readonly string[] = ["ok", "pending", "unavailable"];

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNullableNumber = (value: unknown): value is number | null =>
  isNumber(value) || value === null;
const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

/**
 * The type each field the views read must have. The SDK checks only a card's
 * id and content, so a malformed field would otherwise reach `.join` or
 * `.map` in a view.
 */
const VIEW_FIELD_CHECKS: ReadonlyMap<
  ViewField | "appUrl",
  (value: unknown) => boolean
> = new Map<ViewField | "appUrl", (value: unknown) => boolean>([
  ["aiSummary", isNullableString],
  ["aiTags", isStringArray],
  ["appUrl", isNullableString],
  ["content", isString],
  ["createdAt", isNumber],
  ["fileUrl", isNullableString],
  ["id", isString],
  ["isFavorited", isBoolean],
  ["linkPreviewImageUrl", isNullableString],
  ["metadataDescription", isNullableString],
  ["metadataTitle", isNullableString],
  ["notes", isNullableString],
  ["screenshotUrl", isNullableString],
  ["tags", isStringArray],
  ["thumbnailUrl", isNullableString],
  ["type", isString],
  ["updatedAt", isNumber],
  ["url", isNullableString],
]);

const hasViewFields = (card: JsonObject): boolean =>
  [...VIEW_FIELD_CHECKS].every(([field, check]) =>
    check(Object.hasOwn(card, field) ? card[field] : undefined),
  );

const optional = <T>(
  value: unknown,
  check: (value: unknown) => value is T,
): T | undefined => (check(value) ? value : undefined);

const isCardLink = (value: unknown): value is RaycastCardLink =>
  isJsonObject(value) &&
  isString(value.id) &&
  isBoolean(value.missing) &&
  isNullableString(value.title) &&
  isNullableString(value.type);

const isColor = (value: unknown): value is { hex: string; name?: string } =>
  isJsonObject(value) &&
  isString(value.hex) &&
  (value.name === undefined || isString(value.name));

const isLinkFact = (
  value: unknown,
): value is { label: string; value: string } =>
  isJsonObject(value) && isString(value.label) && isString(value.value);

/** The valid entries of a list, or undefined when it isn't a list. */
const validEntries = <T>(
  value: unknown,
  check: (entry: unknown) => entry is T,
): T[] | undefined => (Array.isArray(value) ? value.filter(check) : undefined);

const isLinkPrice = (value: unknown): value is RaycastLinkPrice | null =>
  value === null ||
  (isJsonObject(value) &&
    isNumber(value.amount) &&
    isNullableString(value.currency));

/**
 * A card from the SDK as the views show it. A field every view reads with
 * the wrong type fails the request; a newer field with the wrong type is left
 * out, as it is for a server that predates it.
 */
export const parseRaycastCard = (card: CardListItem | Card): RaycastCard => {
  const value: unknown = card;
  if (!(isJsonObject(value) && hasViewFields(value))) {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  const checked = card as Card;
  return {
    ...checked,
    aiTranscript: optional(value.aiTranscript, isNullableString),
    archivedAt: optional(value.archivedAt, isNullableNumber),
    backlinks: validEntries(value.backlinks, isCardLink),
    colors: validEntries(value.colors, isColor),
    completedAt: optional(value.completedAt, isNullableNumber),
    fileName: optional(value.fileName, isNullableString),
    fileSize: optional(value.fileSize, isNullableNumber),
    folderIds: optional(value.folderIds, isStringArray),
    isArchived: optional(value.isArchived, isBoolean),
    isDeleted: optional(value.isDeleted, isBoolean),
    isHidden: optional(value.isHidden, isBoolean),
    linkAuthor: optional(value.linkAuthor, isNullableString),
    linkCategory: optional(value.linkCategory, isNullableString),
    linkFacts: validEntries(value.linkFacts, isLinkFact),
    linkPrice: optional(value.linkPrice, isLinkPrice),
    linkPublishedAt: optional(value.linkPublishedAt, isNullableString),
    linkPublisher: optional(value.linkPublisher, isNullableString),
    linkSiteName: optional(value.linkSiteName, isNullableString),
    links: validEntries(value.links, isCardLink),
    mimeType: optional(value.mimeType, isNullableString),
    savedAt: optional(value.savedAt, isNumber),
    sourceTitle: optional(value.sourceTitle, isNullableString),
    sourceUrl: optional(value.sourceUrl, isNullableString),
  };
};

export const parseCardsPageResponse = (page: CardsPage): CardsResponse => ({
  items: page.items.map(parseRaycastCard),
  nextCursor: page.pageInfo.nextCursor,
  similarity:
    page.similarity && SIMILARITY_STATUSES.includes(page.similarity)
      ? page.similarity
      : undefined,
  total: page.items.length,
});

export const parseTagsResponse = (tags: {
  items: TagSummary[];
}): TagsResponse => ({ items: tags.items });

const folderView = ({
  cardCount,
  color,
  id,
  kind,
  name,
  query,
}: Folder): RaycastFolder => ({ cardCount, color, id, kind, name, query });

export const parseFoldersResponse = (folders: {
  items: Folder[];
}): FoldersResponse => ({ items: folders.items.map(folderView) });

export const parseFolder = folderView;

export const parseFolderCardsResult = ({
  failedIds,
  folderLimitIds,
  updatedIds,
}: FolderCardsResult): FolderCardsResult => ({
  failedIds,
  folderLimitIds,
  updatedIds,
});

export const parseTagOperation = ({
  changed,
  error,
  id,
  kind,
  status,
  total,
}: TagOperation): RaycastTagOperation => ({
  changed,
  error,
  id,
  kind,
  status,
  total,
});

export const parseQuickSaveResponse = (
  response: CreateCardResponse,
): QuickSaveResponse => ({
  appUrl: response.appUrl,
  card: response.card ? parseRaycastCard(response.card) : null,
  cardId: response.cardId,
  status: response.status,
  ...(response.resaved === true ? { resaved: true as const } : {}),
  ...(response.resaved === true && response.wasArchived === true
    ? { wasArchived: true as const }
    : {}),
});

export const parseToolCardId = (value: unknown): string => {
  const cardId = typeof value === "string" ? value.trim() : "";
  if (!cardId) {
    throw new Error("cardId is required");
  }
  return cardId;
};
