import BeeperDesktop from "@beeper/desktop-api";
import { closeMainWindow, getPreferenceValues, LocalStorage, OAuth, showHUD } from "@raycast/api";
import {
  MOCK_ACCOUNTS,
  MOCK_CHATS,
  MOCK_CONTACTS,
  MOCK_MESSAGES,
  mockChatToBeeperChat,
  mockMessageToBeeperMessage,
} from "./utils/mock-data";
import { OAuthService, usePromise, getAccessToken } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

let clientInstance: BeeperDesktop | null = null;
let lastBaseURL: string | null = null;
let lastAccessToken: string | null = null;
export const TOKEN_STORAGE_KEY = "beeper-oauth-token";

const getPreferences = () => getPreferenceValues<Preferences>();

const useMockData = () => getPreferences().useMockData === true;

const createOAuthClient = () =>
  new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Beeper Desktop",
    providerIcon: "extension-icon.png",
    providerId: "beeper-desktop-api",
    description: "Connect to your local Beeper Desktop app",
  });

const getBaseURL = () => {
  const preferences = getPreferences();
  return preferences.baseUrl || "http://localhost:23373";
};

const RAYCAST_EXTENSION_AUTHOR = "batuhan";
const RAYCAST_EXTENSION_NAME = "beeper";
const RAYCAST_FOCUS_COMMAND = "focus-app";

export const getRaycastFocusLink = (
  params: {
    chatID?: string;
    draftText?: string;
    draftAttachmentPath?: string;
    messageID?: string;
  } = {},
) => {
  const args = Object.keys(params).length > 0 ? `?arguments=${encodeURIComponent(JSON.stringify(params))}` : "";
  return `raycast://extensions/${RAYCAST_EXTENSION_AUTHOR}/${RAYCAST_EXTENSION_NAME}/${RAYCAST_FOCUS_COMMAND}${args}`;
};

export function createBeeperOAuth() {
  const baseURL = getBaseURL();

  return new OAuthService({
    client: createOAuthClient(),
    clientId: "raycast-beeper-extension",
    scope: "read write",
    authorizeUrl: `${baseURL}/oauth/authorize`,
    tokenUrl: `${baseURL}/oauth/token`,
    refreshTokenUrl: `${baseURL}/oauth/token`,
    bodyEncoding: "url-encoded",
    onAuthorize: async ({ token }) => {
      // Reset client when new token is obtained
      clientInstance = null;
      lastAccessToken = token;
      await LocalStorage.setItem(TOKEN_STORAGE_KEY, token);
    },
  });
}

export function getBeeperDesktop(): BeeperDesktop {
  const baseURL = getBaseURL();
  const { token: accessToken } = getAccessToken();

  if (!clientInstance || lastBaseURL !== baseURL || lastAccessToken !== accessToken) {
    clientInstance = new BeeperDesktop({
      accessToken,
      baseURL: baseURL,
      logLevel: "info",
      timeout: 10000,
      maxRetries: 2,
    });
    lastBaseURL = baseURL;
    lastAccessToken = accessToken;
  }

  return clientInstance;
}

export function useBeeperDesktop<T>(fn: (client: BeeperDesktop) => Promise<T>) {
  return usePromise(async () => fn(getBeeperDesktop()));
}

export async function checkBeeperConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = getBeeperDesktop();
    await client.accounts.list();
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
      return {
        connected: false,
        error:
          "Cannot connect to Beeper Desktop. Make sure Beeper is running and the Desktop API is enabled in Settings -> Developers.",
      };
    }

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return {
        connected: false,
        error: "Authentication failed. Please run a command in Raycast to re-authorize.",
      };
    }

    return { connected: false, error: errorMessage };
  }
}

export async function assertBeeperConnection(): Promise<void> {
  const status = await checkBeeperConnection();
  if (!status.connected) {
    throw new Error(status.error || "Cannot connect to Beeper Desktop");
  }
}

export const focusApp = async (
  params: {
    chatID?: string;
    draftText?: string;
    draftAttachmentPath?: string;
    messageID?: string;
  } = {},
) => {
  try {
    await getBeeperDesktop().focus(params);
    await closeMainWindow();
    await showHUD("Beeper Desktop focused");
  } catch (error) {
    console.error("Failed to focus Beeper Desktop:", error);
    await showHUD("Failed to focus Beeper Desktop");
  }
};

export const retrieveChat = async (
  chatID: string,
  options?: { maxParticipantCount?: number | null },
): Promise<BeeperDesktop.Chat> => {
  if (useMockData()) {
    const match = MOCK_CHATS.find((c) => c.id === chatID);
    if (!match) throw new Error(`Chat not found: ${chatID}`);
    return mockChatToBeeperChat(match);
  }
  return (await getBeeperDesktop().get(`/v1/chats/${encodeURIComponent(chatID)}`, {
    query: options,
  })) as BeeperDesktop.Chat;
};

export const archiveChat = async (chatID: string, archived?: boolean) => {
  return getBeeperDesktop().post(`/v1/chats/${encodeURIComponent(chatID)}/archive`, {
    body: { archived },
  });
};

export const createChatReminder = async (
  chatID: string,
  reminder: { remindAtMs: number; dismissOnIncomingMessage?: boolean },
) => {
  return getBeeperDesktop().post(`/v1/chats/${encodeURIComponent(chatID)}/reminders`, {
    body: reminder,
  });
};

export const deleteChatReminder = async (chatID: string) => {
  return getBeeperDesktop().delete(`/v1/chats/${encodeURIComponent(chatID)}/reminders`);
};

export type MessageAttachmentInput = {
  uploadID: string;
  mimeType?: string;
  fileName?: string;
  size?: { width?: number; height?: number };
  duration?: number;
  type?: "gif" | "voiceNote" | "sticker";
};

export type MessageEditInput = {
  text: string;
};

export type AssetUploadResponse = {
  uploadID: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  srcURL?: string;
};

export type CursorResponse<T> = {
  items: T[];
  hasMore?: boolean;
  newestCursor?: string | null;
  oldestCursor?: string | null;
  cursor?: string | null;
  nextCursor?: string | null;
};

export type UnifiedSearchMessages = {
  items?: BeeperDesktop.Message[];
  chats?: Record<string, BeeperDesktop.Chat>;
  hasMore?: boolean;
  newestCursor?: string | null;
  oldestCursor?: string | null;
};

export type GlobalSearchResponse = {
  results?: {
    chats?: BeeperDesktop.Chat[];
    in_groups?: BeeperDesktop.Chat[];
    messages?: UnifiedSearchMessages;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const getOptionalNullableString = (value: unknown) => (typeof value === "string" || value === null ? value : undefined);

const getOptionalBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);

const getItemsFromResponse = <T>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (isRecord(response) && Array.isArray(response.items)) return response.items as T[];
  return [];
};

const normalizeUnknownCursorResponse = <T>(result: unknown): CursorResponse<T> => {
  if (!isRecord(result)) return { items: [] };
  const items = Array.isArray(result.items) ? (result.items as T[]) : [];
  return {
    items,
    hasMore: getOptionalBoolean(result.hasMore),
    newestCursor: getOptionalNullableString(result.newestCursor),
    oldestCursor: getOptionalNullableString(result.oldestCursor),
    cursor: getOptionalNullableString(result.cursor),
    nextCursor: getOptionalNullableString(result.nextCursor),
  };
};

const getAccessTokenValue = () => getAccessToken().token;

const getAuthHeaders = () => ({ Authorization: `Bearer ${getAccessTokenValue()}` });

const requestJSON = async <T>(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return (await response.json()) as T;
};

export const uploadAssetFromFile = async (filePath: string): Promise<AssetUploadResponse> => {
  const baseURL = getBaseURL();
  const body = new FormData();
  const fileName = basename(filePath);
  const buffer = await readFile(filePath);
  body.append("file", new File([buffer], fileName));
  return requestJSON<AssetUploadResponse>(`${baseURL}/v1/assets/upload`, {
    method: "POST",
    headers: getAuthHeaders(),
    body,
  });
};

export const uploadAssetFromBase64 = async (params: {
  content: string;
  fileName?: string;
  mimeType?: string;
}): Promise<AssetUploadResponse> => {
  const baseURL = getBaseURL();
  return requestJSON<AssetUploadResponse>(`${baseURL}/v1/assets/upload/base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      content: params.content,
      fileName: params.fileName,
      mimeType: params.mimeType,
    }),
  });
};

export const downloadAsset = async (url: string): Promise<{ srcURL: string }> => {
  const baseURL = getBaseURL();
  return requestJSON<{ srcURL: string }>(`${baseURL}/v1/assets/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ url }),
  });
};

export const resolveFilePathFromSrcURL = (srcURL?: string) => {
  if (!srcURL) return undefined;
  if (srcURL.startsWith("file://")) {
    return fileURLToPath(srcURL);
  }
  return undefined;
};

export const getServeAssetURL = (url: string) => {
  const baseURL = getBaseURL();
  const encoded = encodeURIComponent(url);
  return `${baseURL}/v1/assets/serve?url=${encoded}`;
};

export const listAccounts = async (): Promise<BeeperDesktop.Account[]> => {
  if (useMockData()) {
    return MOCK_ACCOUNTS.map((a) => ({
      accountID: a.id,
      user: {
        id: a.id,
        fullName: a.displayName,
        username: a.username,
        isSelf: true,
      },
    }));
  }
  const response = await getBeeperDesktop().get("/v1/accounts");
  return getItemsFromResponse<BeeperDesktop.Account>(response);
};

export const searchContacts = async (accountID: string, query: string) => {
  if (useMockData()) {
    const q = query.toLowerCase();
    return MOCK_CONTACTS.filter(
      (c) => c.accountID === accountID && [c.fullName, c.username, c.id].some((v) => v?.toLowerCase().includes(q)),
    ).map((c) => ({ id: c.id, fullName: c.fullName, username: c.username, isSelf: c.isSelf }) as BeeperDesktop.User);
  }
  const response = await getBeeperDesktop().get(`/v1/accounts/${encodeURIComponent(accountID)}/contacts`, {
    query: { query },
  });
  return getItemsFromResponse<BeeperDesktop.User>(response);
};

export const listChats = async (params?: {
  accountIDs?: string[];
  cursor?: string | null;
  direction?: "after" | "before";
}): Promise<CursorResponse<BeeperDesktop.Chat>> => {
  const response = await getBeeperDesktop().get("/v1/chats", { query: params });
  return normalizeUnknownCursorResponse<BeeperDesktop.Chat>(response);
};

export const searchChats = async (params: {
  accountIDs?: string[];
  cursor?: string | null;
  direction?: "after" | "before";
  inbox?: "primary" | "low-priority" | "archive";
  includeMuted?: boolean;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  participantQuery?: string;
  query?: string;
  type?: "single" | "group" | "channel" | "any";
  unreadOnly?: boolean;
  limit?: number;
}) => {
  if (useMockData()) {
    const requestedInbox = params.inbox ?? "primary";
    let items = requestedInbox === "primary" ? MOCK_CHATS.map((c) => mockChatToBeeperChat(c)) : [];
    if (params.unreadOnly) {
      items = items.filter((c) => (c.unreadCount ?? 0) > 0);
    }
    if (params.includeMuted === false) {
      items = items.filter((c) => !c.isMuted);
    }
    if (params.type && params.type !== "any") {
      items = items.filter((c) => c.type === params.type);
    }
    const limit = params.limit ?? 50;
    const result = items.slice(0, limit);
    return { items: result, hasMore: false, newestCursor: null, oldestCursor: null };
  }
  const response = await getBeeperDesktop().get("/v1/chats/search", { query: params });
  return normalizeUnknownCursorResponse<BeeperDesktop.Chat>(response);
};

export const createChat = async (body: {
  accountID: string;
  participantIDs: string[];
  type: "single" | "group";
  title?: string;
  messageText?: string;
}) => {
  return getBeeperDesktop().chats.create(body);
};

export const listChatMessages = async (
  chatID: string,
  params?: { cursor?: string | null; direction?: "after" | "before" },
): Promise<CursorResponse<BeeperDesktop.Message>> => {
  if (useMockData()) {
    const items = MOCK_MESSAGES.filter((m) => m.chatId === chatID)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(mockMessageToBeeperMessage);
    return { items, hasMore: false };
  }
  const response = await getBeeperDesktop().get(`/v1/chats/${encodeURIComponent(chatID)}/messages`, {
    query: params,
  });
  return normalizeUnknownCursorResponse<BeeperDesktop.Message>(response);
};

export const searchMessages = async (params: {
  query?: string;
  chatIDs?: string[];
  sender?: "me" | "others" | string;
  accountIDs?: string[];
  chatType?: "group" | "single";
  includeMuted?: boolean;
  excludeLowPriority?: boolean | null;
  mediaTypes?: Array<"any" | "video" | "image" | "link" | "file">;
  dateAfter?: string;
  dateBefore?: string;
  cursor?: string | null;
  direction?: "after" | "before";
  limit?: number;
}): Promise<CursorResponse<BeeperDesktop.Message>> => {
  if (useMockData()) {
    let items = [...MOCK_MESSAGES];
    if (params.query) {
      const q = params.query.toLowerCase();
      items = items.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.service.toLowerCase().includes(q),
      );
    }
    if (params.chatIDs?.length) {
      const ids = new Set(params.chatIDs);
      items = items.filter((m) => ids.has(m.chatId));
    }
    if (params.sender === "me") {
      items = items.filter((m) => m.isSender);
    } else if (params.sender === "others") {
      items = items.filter((m) => !m.isSender);
    }
    const limit = params.limit ?? 20;
    return {
      items: items.slice(0, limit).map(mockMessageToBeeperMessage),
      hasMore: false,
    };
  }
  const response = await getBeeperDesktop().get("/v1/messages/search", { query: params });
  return normalizeUnknownCursorResponse<BeeperDesktop.Message>(response);
};

export const searchAll = async (params: { query: string }): Promise<GlobalSearchResponse> => {
  return getBeeperDesktop().get("/v1/search", { query: params });
};

export const sendMessage = async (
  chatID: string,
  message: { text?: string; replyToMessageID?: string; attachment?: MessageAttachmentInput },
) => {
  return getBeeperDesktop().post(`/v1/chats/${encodeURIComponent(chatID)}/messages`, { body: message });
};

export const updateMessage = async (chatID: string, messageID: string, update: MessageEditInput) => {
  return getBeeperDesktop().put(`/v1/chats/${encodeURIComponent(chatID)}/messages/${encodeURIComponent(messageID)}`, {
    body: update,
  });
};

export const downloadMessageAttachments = async (params: {
  chatID: string;
  messageID: string;
  url?: string;
}): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  if (params.url) {
    try {
      const response = await downloadAsset(params.url);
      const filePath = resolveFilePathFromSrcURL(response.srcURL);
      if (!filePath) {
        return { success: false, error: "Downloaded asset did not return a local file path" };
      }
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  throw new Error("Attachment download not supported by this SDK version");
};
