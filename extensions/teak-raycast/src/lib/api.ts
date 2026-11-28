import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  type CreateCardInput,
  createTeakClient,
  TeakApiError,
  type TeakClient,
  type TokenProvider,
  type UpdateCardInput,
} from "teak-sdk";
import {
  RaycastApiError,
  type RaycastApiErrorCode,
  toErrorCode,
} from "./apiErrors";
import {
  type CardsResponse,
  type FolderCardsResult,
  type FoldersResponse,
  parseCardsPageResponse,
  parseFolder,
  parseFolderCardsResult,
  parseFoldersResponse,
  parseQuickSaveResponse,
  parseRaycastCard,
  parseTagOperation,
  parseTagsResponse,
  type QuickSaveResponse,
  type RaycastCard,
  type RaycastFolder,
  type RaycastTagOperation,
  type TagsResponse,
} from "./apiParsers";
import { getApiBaseUrl } from "./constants";
import { HIDDEN_TAGS } from "./hiddenTags";
import {
  authorizeTeak,
  getStoredTeakAccessToken,
  reauthorizeTeak,
  TeakDiscoveryError,
} from "./oauth";
import { grandfatheredApiKey } from "./preferences";
import type { RaycastCardType, RaycastSort } from "./searchFilters";

export {
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastApiErrorCode,
} from "./apiErrors";
export type {
  CardsResponse,
  FolderCardsResult,
  FoldersResponse,
  QuickSaveResponse,
  RaycastCard,
  RaycastCardLink,
  RaycastFolder,
  RaycastLinkPrice,
  RaycastTagOperation,
  TagSummary,
  TagsResponse,
} from "./apiParsers";

/**
 * The SDK's card list filters as Raycast's views set them: one type, the
 * sorts Raycast offers, and the detail fields it always asks for.
 */
export type CardSearchInput = Omit<
  NonNullable<Parameters<TeakClient["cards"]["list"]>[0]>,
  "include" | "sort" | "type"
> & {
  sort?: RaycastSort;
  type?: RaycastCardType;
};

const CARD_DETAIL_INCLUDE = "content,metadata,processing";

export type { CreateCardInput, UpdateCardInput } from "teak-sdk";

export type AuthMode = "interactive" | "silent";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

const getRequestTimeoutMs = (): number => {
  const parsed = Number.parseInt(
    process.env.TEAK_API_REQUEST_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_REQUEST_TIMEOUT_MS;
};

const logApiRequestFailure = (
  context: Record<string, unknown>,
  error?: unknown,
) => {
  console.error("[Teak Raycast] API request failed", {
    ...context,
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
          }
        : error,
  });
};

const withLoopbackFallback = (url: string): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return url;
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname !== "localhost" && !hostname.endsWith(".localhost")) {
    return url;
  }
  parsedUrl.hostname = "127.0.0.1";
  return parsedUrl.toString();
};

// A local API on `localhost` may only answer on 127.0.0.1, so a failed
// request is tried once more there before it counts as a network failure.
const fetchWithLoopbackFallback = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const url = input instanceof Request ? input.url : String(input);
  try {
    return await fetch(url, init);
  } catch (requestError) {
    const fallbackUrl = withLoopbackFallback(url);
    if (fallbackUrl === url) {
      logApiRequestFailure(
        { method: init?.method ?? "GET", url },
        requestError,
      );
      throw requestError;
    }
    try {
      return await fetch(fallbackUrl, init);
    } catch (fallbackError) {
      logApiRequestFailure(
        { fallbackUrl, method: init?.method ?? "GET", url },
        fallbackError,
      );
      throw fallbackError;
    }
  }
}) as typeof fetch;

type CredentialSource = "apiKey" | "oauth";

const tokenProviderFor = (
  auth: AuthMode,
): TokenProvider & { source: () => CredentialSource | undefined } => {
  let source: CredentialSource | undefined;
  const throwDiscoveryAsNetwork = (error: unknown): never => {
    throw error instanceof TeakDiscoveryError
      ? new RaycastApiError("NETWORK_ERROR")
      : error;
  };
  return {
    source: () => source,
    getAccessToken: async () => {
      const apiKey = grandfatheredApiKey();
      if (apiKey) {
        source = "apiKey";
        return apiKey;
      }
      source = "oauth";
      const accessToken = await (
        auth === "silent" ? getStoredTeakAccessToken() : authorizeTeak()
      ).catch(throwDiscoveryAsNetwork);
      if (!accessToken) {
        throw new RaycastApiError("SIGN_IN_REQUIRED", 401);
      }
      return accessToken;
    },
    onUnauthorized: (): Promise<string | null> | null =>
      source === "oauth" && auth === "interactive"
        ? reauthorizeTeak().catch(throwDiscoveryAsNetwork)
        : null,
  };
};

const raycastCodeFor = (
  error: TeakApiError,
  source: CredentialSource | undefined,
): RaycastApiErrorCode => {
  switch (error.status) {
    case 401:
      // A missing, expired or revoked credential: an API key is replaced in
      // preferences, a browser sign-in is done again.
      return source === "oauth" ? "SIGN_IN_REQUIRED" : "INVALID_API_KEY";
    case 404:
      return toErrorCode(error.code, "NOT_FOUND");
    case 429:
      return "RATE_LIMITED";
    default:
      return toErrorCode(error.code, "REQUEST_FAILED");
  }
};

const toRaycastError = (
  error: unknown,
  source: CredentialSource | undefined,
): unknown => {
  if (!(error instanceof TeakApiError)) {
    return error;
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return new RaycastApiError("NETWORK_ERROR");
  }
  if (error.code === "PARSE_ERROR" && (error.status ?? 0) < 400) {
    return new RaycastApiError("REQUEST_FAILED", error.status);
  }
  const code = raycastCodeFor(error, source);
  logApiRequestFailure({
    code,
    message: error.message,
    requestId: error.requestId,
    status: error.status,
  });
  return new RaycastApiError(code, error.status);
};

const withClient = async <T>(
  auth: AuthMode,
  call: (client: TeakClient) => Promise<T>,
): Promise<T> => {
  const tokenProvider = tokenProviderFor(auth);
  const client = createTeakClient({
    baseUrl: getApiBaseUrl(),
    fetch: fetchWithLoopbackFallback,
    timeoutMs: getRequestTimeoutMs(),
    tokenProvider,
    userAgent: "teak-raycast",
  });
  try {
    return await call(client);
  } catch (error) {
    throw toRaycastError(error, tokenProvider.source());
  }
};

const requireCardId = (cardId: string): string => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }
  return normalizedCardId;
};

export const createCard = (
  input: CreateCardInput,
  auth: AuthMode,
): Promise<QuickSaveResponse> =>
  withClient(auth, async (client) =>
    parseQuickSaveResponse(await client.cards.create(input)),
  );

export const quickSaveCard = (
  input: string | CreateCardInput,
  auth: AuthMode,
): Promise<QuickSaveResponse> =>
  createCard(typeof input === "string" ? { content: input } : input, auth);

export const searchCards = (
  input: CardSearchInput,
  auth: AuthMode,
): Promise<CardsResponse> =>
  withClient(auth, async (client) =>
    parseCardsPageResponse(
      await client.cards.list({ ...input, include: CARD_DETAIL_INCLUDE }),
    ),
  );

export const hasHiddenCards = async (auth: AuthMode): Promise<boolean> => {
  const pages = await Promise.all(
    HIDDEN_TAGS.map((tag) => searchCards({ limit: 1, tag }, auth)),
  );
  return pages.some((page) => page.items.length > 0);
};

export const getFavoriteCards = (
  input: CardSearchInput,
  auth: AuthMode,
): Promise<CardsResponse> => searchCards({ ...input, favorited: true }, auth);

// The id check runs inside the client call so a blank id rejects like any
// other request failure instead of throwing synchronously.
export const getCardById = (
  cardId: string,
  auth: AuthMode,
): Promise<RaycastCard> =>
  withClient(auth, async (client) =>
    parseRaycastCard(await client.cards.get(requireCardId(cardId))),
  );

export const updateCard = (
  cardId: string,
  input: UpdateCardInput,
  auth: AuthMode,
): Promise<RaycastCard> =>
  withClient(auth, async (client) =>
    parseRaycastCard(await client.cards.update(requireCardId(cardId), input)),
  );

export const setCardFavorite = (
  cardId: string,
  isFavorited: boolean,
  auth: AuthMode,
): Promise<RaycastCard> =>
  withClient(auth, async (client) =>
    parseRaycastCard(
      await client.cards.setFavorite(requireCardId(cardId), isFavorited),
    ),
  );

export const setCardArchived = (
  cardId: string,
  isArchived: boolean,
  auth: AuthMode,
): Promise<RaycastCard> =>
  withClient(auth, async (client) =>
    parseRaycastCard(
      await client.cards.setArchived(requireCardId(cardId), isArchived),
    ),
  );

export const setCardDone = (
  cardId: string,
  done: boolean,
  auth: AuthMode,
): Promise<RaycastCard> =>
  withClient(auth, async (client) =>
    parseRaycastCard(await client.cards.setDone(requireCardId(cardId), done)),
  );

export const refreshCard = async (
  cardId: string,
  auth: AuthMode,
): Promise<void> => {
  await withClient(auth, (client) =>
    client.cards.refresh(requireCardId(cardId)),
  );
};

export const softDeleteCard = async (
  cardId: string,
  auth: AuthMode,
): Promise<void> => {
  await withClient(auth, (client) =>
    client.cards.delete(requireCardId(cardId)),
  );
};

export const restoreCard = async (
  cardId: string,
  auth: AuthMode,
): Promise<void> => {
  await withClient(auth, (client) =>
    client.cards.restore(requireCardId(cardId)),
  );
};

export const permanentlyDeleteCard = async (
  cardId: string,
  auth: AuthMode,
): Promise<void> => {
  await withClient(auth, (client) =>
    client.cards.delete(requireCardId(cardId), { permanent: true }),
  );
};

const MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  m4a: "audio/mp4",
  md: "text/markdown",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  zip: "application/zip",
};

export const mimeTypeForFile = (filePath: string): string => {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
};

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const requireWebUrl = (url: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RaycastApiError("REQUEST_FAILED");
  }
  if (
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname))
  ) {
    return parsed.href;
  }
  throw new RaycastApiError("REQUEST_FAILED");
};

export const saveFileCard = async (
  filePath: string,
  input: { source: string; tags?: string[] },
  auth: AuthMode,
): Promise<QuickSaveResponse> => {
  const fileName = basename(filePath);
  const { size: fileSize } = await stat(filePath);
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new RaycastApiError("INVALID_INPUT");
  }
  const mimeType = mimeTypeForFile(filePath);
  return withClient(auth, async (client) => {
    const upload = await client.uploads.create({
      fileName,
      fileSize,
      mimeType,
    });
    const { fileEtag } = await client.uploads.putFile(
      requireWebUrl(upload.uploadUrl),
      await readFile(filePath),
      mimeType,
    );
    return parseQuickSaveResponse(
      await client.cards.create({
        fileEtag,
        fileKey: upload.fileKey,
        fileName,
        fileSize,
        mimeType,
        source: input.source,
        tags: input.tags,
      }),
    );
  });
};

export const listTags = (auth: AuthMode): Promise<TagsResponse> =>
  withClient(auth, async (client) =>
    parseTagsResponse(await client.tags.list()),
  );

export const startTagOperation = (
  operation:
    | { kind: "delete"; tag: string }
    | { kind: "merge"; into: string; tag: string }
    | { kind: "rename"; tag: string; to: string },
  auth: AuthMode,
): Promise<RaycastTagOperation> =>
  withClient(auth, async (client) => {
    switch (operation.kind) {
      case "delete":
        return parseTagOperation(await client.tags.delete(operation.tag));
      case "merge":
        return parseTagOperation(
          await client.tags.merge(operation.tag, operation.into),
        );
      default:
        return parseTagOperation(
          await client.tags.rename(operation.tag, operation.to),
        );
    }
  });

export const getTagOperation = (
  operationId: string,
  auth: AuthMode,
): Promise<RaycastTagOperation> =>
  withClient(auth, async (client) =>
    parseTagOperation(await client.tags.operation(operationId)),
  );

export const listFolders = (auth: AuthMode): Promise<FoldersResponse> =>
  withClient(auth, async (client) =>
    parseFoldersResponse(await client.folders.list()),
  );

export const createSmartFolder = (
  input: { name: string; query: string },
  auth: AuthMode,
): Promise<RaycastFolder> =>
  withClient(auth, async (client) =>
    parseFolder(await client.folders.create({ ...input, kind: "smart" })),
  ).catch((error: unknown) => {
    // Creating a folder conflicts only with a folder of the same name.
    throw error instanceof RaycastApiError && error.code === "CONFLICT"
      ? new RaycastApiError("FOLDER_EXISTS", 409)
      : error;
  });

export const addCardToFolder = (
  folderId: string,
  cardId: string,
  auth: AuthMode,
): Promise<FolderCardsResult> =>
  withClient(auth, async (client) =>
    parseFolderCardsResult(
      await client.folders.addCards(folderId, [requireCardId(cardId)]),
    ),
  );
