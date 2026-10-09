import { TelegramClient, Rich, events } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { LocalStorage, environment } from "@raycast/api";
import { Api } from "teleproto/tl";
import { computeCheck } from "teleproto/Password";
import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";

const QR_CODE_TIMEOUT = 30000;

const SESSION_KEY = "telegram_session";
const AUTH_SESSION_KEY = "telegram_auth_session";
const USER_ID_KEY = "telegram_user_id";
const MEDIA_CACHE_DIR = path.join(environment.supportPath, "media");

export type MediaType =
  | "photo"
  | "video"
  | "audio"
  | "file"
  | "document"
  | "image"
  | "link"
  | "location"
  | "contact"
  | "poll"
  | "sticker"
  | "voice"
  | "gif"
  | "unknown";

export type ChatType = "private" | "group";

export interface MessageMedia {
  type: MediaType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
  filePath?: string;
}

export interface SavedMessage {
  id: number;
  text: string;
  /** Rendered Markdown, set only for rich messages (layer 228+). */
  markdown?: string;
  date: Date;
  media?: MessageMedia;
}

export interface ChatMessage {
  id: number;
  text: string;
  /** Rendered Markdown, set only for rich messages (layer 228+). */
  markdown?: string;
  date: Date;
  media?: MessageMedia;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
}

export interface Chat {
  id: string;
  title: string;
  type: ChatType;
  lastMessage?: ChatMessage;
  unreadCount: number;
  photo?: string;
  isPinned: boolean;
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
}

export interface GetChatsOptions {
  config: TelegramConfig;
  limit?: number;
  skipPhotoDownload?: boolean;
}

export interface GetMessagesOptions {
  config: TelegramConfig;
  chatId: string;
  limit?: number;
  searchQuery?: string;
  skipMediaDownload?: boolean;
}

export interface GetSavedMessagesOptions {
  config: TelegramConfig;
  limit?: number;
  searchQuery?: string;
  skipMediaDownload?: boolean;
}

export interface SendMessageOptions {
  config: TelegramConfig;
  chatId: string;
  message: string;
  filePaths?: string | string[];
}

export interface AuthenticationResult {
  needsPassword: boolean;
  success?: boolean;
}

let clientInstance: TelegramClient | null = null;

export async function getClient(config: TelegramConfig): Promise<TelegramClient> {
  if (clientInstance && clientInstance.connected) {
    if (clientInstance.apiId === config.apiId && clientInstance.apiHash === config.apiHash) {
      return clientInstance;
    }
    try {
      await clientInstance.disconnect();
    } catch {
      // Disconnect failed, allow recreation
    }
    clientInstance = null;
  }

  const sessionString =
    (await LocalStorage.getItem<string>(SESSION_KEY)) || (await LocalStorage.getItem<string>(AUTH_SESSION_KEY));
  const session = new StringSession(sessionString || "");

  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
    deviceModel: "Raycast",
    systemVersion: process.platform === "win32" ? "Windows" : "macOS",
    appVersion: "1.0.0",
  });

  clientInstance = client;
  return client;
}

export async function isAuthenticated(): Promise<boolean> {
  const sessionString = await LocalStorage.getItem<string>(SESSION_KEY);
  return !!sessionString;
}

export async function logOut(config?: TelegramConfig): Promise<void> {
  let client: TelegramClient | null = null;
  try {
    client = clientInstance || (config ? await getClient(config) : null);
    if (client) {
      if (!client.connected) {
        await client.connect();
      }
      if (await client.isUserAuthorized()) {
        await client.invoke(new Api.auth.LogOut());
      }
    }
  } catch {
    // Network or server error during logout -- proceed with clearing local storage
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // Disconnect failed, ignore
      }
    }
    clientInstance = null;
    await LocalStorage.removeItem(SESSION_KEY);
    await LocalStorage.removeItem(AUTH_SESSION_KEY);
    await LocalStorage.removeItem(USER_ID_KEY);
  }
}

async function completeAuthentication(
  client: TelegramClient,
  isAborted?: () => boolean,
): Promise<AuthenticationResult> {
  if (isAborted?.()) return { needsPassword: false, success: false };
  const session = client.session.save() as unknown as string;
  await LocalStorage.setItem(SESSION_KEY, session);

  if (isAborted?.()) return { needsPassword: false, success: false };
  const me = await client.getMe();
  await LocalStorage.setItem(USER_ID_KEY, me.id.toString());

  await LocalStorage.removeItem(AUTH_SESSION_KEY);

  return { needsPassword: false, success: true };
}

export async function authenticateWithPassword(
  config: TelegramConfig,
  password: string,
): Promise<AuthenticationResult> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  const accountPassword = await client.invoke(new Api.account.GetPassword());
  await client.invoke(
    new Api.auth.CheckPassword({
      password: await computeCheck(accountPassword, password),
    }),
  );

  return completeAuthentication(client);
}

export interface QrCodeAuthCallbacks {
  onQrCode: (qrData: { tgUrl: string; dataUrl: string }) => void | Promise<void>;
  abortSignal?: AbortSignal;
}

async function handleLoginTokenResult(
  client: TelegramClient,
  result: Api.auth.TypeLoginToken,
  isAborted?: () => boolean,
): Promise<AuthenticationResult> {
  if (result instanceof Api.auth.LoginTokenSuccess && result.authorization instanceof Api.auth.Authorization) {
    if (isAborted?.()) return { needsPassword: false, success: false };
    return completeAuthentication(client, isAborted);
  }

  if (result instanceof Api.auth.LoginTokenMigrateTo) {
    if (isAborted?.()) return { needsPassword: false, success: false };
    await (client as unknown as { _switchDC: (dcId: number) => Promise<void> })._switchDC(result.dcId);
    if (isAborted?.()) return { needsPassword: false, success: false };
    const migratedResult = await client.invoke(
      new Api.auth.ImportLoginToken({
        token: result.token,
      }),
    );
    if (isAborted?.()) return { needsPassword: false, success: false };
    if (
      migratedResult instanceof Api.auth.LoginTokenSuccess &&
      migratedResult.authorization instanceof Api.auth.Authorization
    ) {
      return completeAuthentication(client, isAborted);
    }
  }

  throw new Error(`Unexpected login token result: ${(result as { className?: string })?.className || "unknown"}`);
}

export async function authenticateWithQr(
  config: TelegramConfig,
  callbacks: QrCodeAuthCallbacks,
): Promise<AuthenticationResult> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  if (await client.isUserAuthorized()) {
    return completeAuthentication(client);
  }

  const { abortSignal } = callbacks;
  const isAborted = () => !!abortSignal?.aborted;
  if (isAborted()) {
    return { needsPassword: false, success: false };
  }

  let scanDetected = false;
  let resolveScanWait: (() => void) | undefined;

  const rawEvent = new events.Raw({});
  const onUpdate = (update: unknown) => {
    if (update instanceof Api.UpdateLoginToken) {
      scanDetected = true;
      resolveScanWait?.();
    }
  };
  client.addEventHandler(onUpdate, rawEvent);

  try {
    while (!isAborted()) {
      let result: Api.auth.TypeLoginToken;
      try {
        result = await client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: config.apiId,
            apiHash: config.apiHash,
            exceptIds: [],
          }),
        );

        if (isAborted()) {
          return { needsPassword: false, success: false };
        }

        if (result instanceof Api.auth.LoginTokenSuccess || result instanceof Api.auth.LoginTokenMigrateTo) {
          return await handleLoginTokenResult(client, result, isAborted);
        }
      } catch (err: unknown) {
        if (isAborted()) {
          return { needsPassword: false, success: false };
        }

        const errorText =
          err instanceof Error ? err.message : String((err as { errorMessage?: string })?.errorMessage || err);
        const upper = errorText.toUpperCase();

        if (upper.includes("SESSION_PASSWORD_NEEDED") || upper.includes("ACCOUNT HAS 2FA ENABLED")) {
          await LocalStorage.setItem(AUTH_SESSION_KEY, client.session.save() as unknown as string);
          return { needsPassword: true, success: false };
        }

        if (upper.includes("AUTH_TOKEN_ALREADY_ACCEPTED")) {
          if (await client.isUserAuthorized()) {
            return completeAuthentication(client, isAborted);
          }
          await LocalStorage.setItem(AUTH_SESSION_KEY, client.session.save() as unknown as string);
          return { needsPassword: true, success: false };
        }

        throw err;
      }

      if (result instanceof Api.auth.LoginToken) {
        if (scanDetected) {
          scanDetected = false;
          continue;
        }

        const base64Url = Buffer.from(result.token).toString("base64url");
        const tgUrl = `tg://login?token=${base64Url}`;
        const dataUrl = await QRCode.toDataURL(tgUrl, {
          margin: 1,
          width: 200,
        });

        if (isAborted()) {
          return { needsPassword: false, success: false };
        }

        await callbacks.onQrCode({ tgUrl, dataUrl });

        if (!scanDetected && !isAborted()) {
          await new Promise<void>((resolve) => {
            let timer: NodeJS.Timeout | undefined;
            let onAbort: (() => void) | undefined;

            const cleanup = () => {
              if (timer !== undefined) {
                clearTimeout(timer);
                timer = undefined;
              }
              if (onAbort && abortSignal) {
                abortSignal.removeEventListener("abort", onAbort);
              }
              resolveScanWait = undefined;
            };

            const done = () => {
              cleanup();
              resolve();
            };

            resolveScanWait = done;
            timer = setTimeout(done, QR_CODE_TIMEOUT);

            if (abortSignal) {
              onAbort = done;
              abortSignal.addEventListener("abort", onAbort, { once: true });
            }
          });
        }
      }
    }

    return { needsPassword: false, success: false };
  } finally {
    client.removeEventHandler(onUpdate, rawEvent);
  }
}

function ensureMediaCacheDir(): void {
  if (!fs.existsSync(MEDIA_CACHE_DIR)) {
    fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
  }
}

function getFileExtensionFromMimeType(mimeType?: string): string {
  if (!mimeType) return ".jpg";

  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };

  return mimeToExt[mimeType] || "";
}

function getMediaId(message: Api.Message): string {
  if (!message.media) {
    return message.id.toString();
  }

  const mediaClassName = message.media.className;

  if (mediaClassName === "MessageMediaPhoto") {
    const photoMedia = message.media as Api.MessageMediaPhoto;
    if (photoMedia.photo && "id" in photoMedia.photo) {
      const photo = photoMedia.photo as Api.Photo;
      return photo.id.toString();
    }
  } else if (mediaClassName === "MessageMediaDocument") {
    const docMedia = message.media as Api.MessageMediaDocument;
    if (docMedia.document && "id" in docMedia.document) {
      const doc = docMedia.document as Api.Document;
      return doc.id.toString();
    }
  }

  return message.id.toString();
}

async function downloadMedia(
  client: TelegramClient,
  message: Api.Message,
  mimeType?: string,
): Promise<string | undefined> {
  try {
    ensureMediaCacheDir();

    const mediaId = getMediaId(message);
    const extension = getFileExtensionFromMimeType(mimeType);
    const fileName = `media_${mediaId}${extension}`;
    const filePath = path.join(MEDIA_CACHE_DIR, fileName);

    if (fs.existsSync(filePath)) {
      return filePath;
    }

    const buffer = await client.downloadMedia(message, { outputFile: filePath });

    if (buffer) {
      return filePath;
    }
  } catch (error) {
    console.error("Failed to download media:", error);
  }

  return undefined;
}

async function downloadProfilePhoto(
  client: TelegramClient,
  entity: Api.User | Api.Chat | Api.Channel,
  entityId: string | number,
  entityType: "profile" | "chat" | "channel",
): Promise<string | undefined> {
  try {
    ensureMediaCacheDir();

    const photoPath = path.join(MEDIA_CACHE_DIR, `${entityType}_${entityId}.jpg`);

    if (fs.existsSync(photoPath)) {
      return photoPath;
    }

    await client.downloadProfilePhoto(entity, { outputFile: photoPath });

    if (fs.existsSync(photoPath)) {
      return photoPath;
    }
  } catch (error) {
    console.error(`Failed to download ${entityType} photo:`, error);
  }

  return undefined;
}

/**
 * Works out who authored a message, and their id.
 *
 * Telegram fills this in three different ways, and only one of them sets `fromId`:
 * group members set `fromId` to a user, channel posts and anonymous group admins set
 * it to a channel, and both broadcast posts and private chats may omit it entirely --
 * in which case the author is whatever the message is attached to.
 *
 * Kept free of network calls so the attribution rules can be unit tested.
 */
export function resolveMessageAuthor(
  msg: Api.Message,
  chatEntity?: Api.User | Api.Chat | Api.Channel,
): { senderId?: string; entity?: Api.User | Api.Channel } {
  if (msg.fromId instanceof Api.PeerUser) {
    // Prefer the entity the library already attached to the message: it comes from the
    // users map on the same response. client.getEntity() needs a populated entity cache,
    // and StringSession does not persist one, so in a fresh Raycast command process it
    // throws "Could not find the input entity" for anyone we have not just fetched.
    return {
      senderId: msg.fromId.userId.toString(),
      entity: msg.sender instanceof Api.User ? msg.sender : undefined,
    };
  }

  if (msg.fromId instanceof Api.PeerChannel) {
    return {
      senderId: msg.fromId.channelId.toString(),
      entity: msg.sender instanceof Api.Channel ? msg.sender : undefined,
    };
  }

  if (!msg.fromId) {
    const author = msg.sender ?? chatEntity;
    if (author instanceof Api.Channel || author instanceof Api.User) {
      return { senderId: author.id.toString(), entity: author };
    }
  }

  return {};
}

/**
 * Reads a message's text.
 *
 * Bots can send rich messages (layer 228), whose content lives in `richMessage`
 * as a block tree rather than in the flat `message` string. Older clients are not
 * shown these at all -- the server substitutes messageMediaUnsupported -- so any
 * code that only reads `msg.message` silently loses every rich message.
 */
export function renderMessageContent(msg: Api.Message): { text: string; markdown?: string } {
  if (msg.message) {
    return { text: msg.message };
  }

  if (msg.richMessage) {
    const plain = Rich.toPlainText(msg.richMessage);
    return {
      // List titles are single-line, so collapse the block structure for display.
      text: plain.replace(/\s+/g, " ").trim(),
      markdown: Rich.toMarkdown(msg.richMessage),
    };
  }

  return { text: "" };
}

/** True when a message carries anything worth rendering. */
export function hasRenderableContent(msg: Api.Message): boolean {
  return Boolean(msg.message || msg.media || msg.richMessage);
}

/** Display name and avatar for a user, matching how getChats titles a private chat. */
async function describeUser(
  client: TelegramClient,
  user: Api.User,
  skipPhotoDownload: boolean,
): Promise<{ name: string; photo?: string }> {
  let name = user.firstName || "";
  if (user.lastName) name += ` ${user.lastName}`;

  if (user.deleted) {
    name = "Deleted Account";
  } else if (!name.trim()) {
    name = "Unknown User";
  }

  let photo: string | undefined;
  if (!skipPhotoDownload && user.photo && "photoId" in user.photo) {
    photo = await downloadProfilePhoto(client, user, user.id.toString(), "profile");
  }

  return { name, photo };
}

export function parseMessageMedia(msg: Api.Message): MessageMedia | undefined {
  if (!msg.media) return undefined;

  const mediaClassName = msg.media.className;

  if (mediaClassName === "MessageMediaPhoto") {
    const photo = msg.media as Api.MessageMediaPhoto;
    const photoObj = photo.photo;
    if (photoObj && "sizes" in photoObj) {
      const largestSize = photoObj.sizes[photoObj.sizes.length - 1];
      return {
        type: "photo",
        mimeType: "image/jpeg",
        width: "w" in largestSize ? largestSize.w : undefined,
        height: "h" in largestSize ? largestSize.h : undefined,
      };
    }
    return { type: "photo", mimeType: "image/jpeg" };
  }

  if (mediaClassName === "MessageMediaDocument") {
    const doc = msg.media as Api.MessageMediaDocument;
    if (doc.document && "mimeType" in doc.document) {
      const document = doc.document;
      const mimeType = document.mimeType;

      const fileNameAttr = document.attributes?.find((attr) => attr.className === "DocumentAttributeFilename") as
        | Api.DocumentAttributeFilename
        | undefined;
      const fileName = fileNameAttr?.fileName;

      const videoAttr = document.attributes?.find((attr) => attr.className === "DocumentAttributeVideo") as
        | Api.DocumentAttributeVideo
        | undefined;

      const audioAttr = document.attributes?.find((attr) => attr.className === "DocumentAttributeAudio") as
        | Api.DocumentAttributeAudio
        | undefined;

      let type: MediaType = "file";
      let duration: number | undefined;
      let width: number | undefined;
      let height: number | undefined;

      if (mimeType?.startsWith("video/")) {
        type = "video";
        if (videoAttr) {
          duration = videoAttr.duration;
          width = videoAttr.w;
          height = videoAttr.h;
        }
      } else if (mimeType?.startsWith("audio/")) {
        type = audioAttr?.voice ? "voice" : "audio";
        if (audioAttr) {
          duration = audioAttr.duration;
        }
      } else if (mimeType?.startsWith("image/")) {
        type = mimeType === "image/gif" ? "gif" : "image";
      } else if (fileName?.endsWith(".webm") || fileName?.endsWith(".tgs")) {
        type = "sticker";
      }

      return {
        type,
        fileName,
        fileSize: Number(document.size),
        mimeType,
        duration,
        width,
        height,
      };
    }
    return { type: "document" };
  }

  if (mediaClassName === "MessageMediaWebPage") {
    return { type: "link" };
  }

  if (mediaClassName === "MessageMediaGeo" || mediaClassName === "MessageMediaVenue") {
    return { type: "location" };
  }

  if (mediaClassName === "MessageMediaContact") {
    return { type: "contact" };
  }

  if (mediaClassName === "MessageMediaPoll") {
    return { type: "poll" };
  }

  return { type: "unknown" };
}

async function processSavedMessage(
  client: TelegramClient,
  msg: Api.Message,
  skipMediaDownload: boolean,
): Promise<SavedMessage> {
  const media = parseMessageMedia(msg);

  if (!skipMediaDownload && media && ["photo", "image", "video", "gif"].includes(media.type)) {
    const filePath = await downloadMedia(client, msg, media.mimeType);
    if (filePath) {
      media.filePath = filePath;
    }
  }

  const { text, markdown } = renderMessageContent(msg);

  return {
    id: msg.id,
    text,
    markdown,
    date: new Date(msg.date * 1000),
    media,
  };
}

async function processChatMessage(
  client: TelegramClient,
  msg: Api.Message,
  skipMediaDownload: boolean,
  chatEntity?: Api.User | Api.Chat | Api.Channel,
): Promise<ChatMessage> {
  const media = parseMessageMedia(msg);

  if (!skipMediaDownload && media && ["photo", "image", "video", "gif"].includes(media.type)) {
    const filePath = await downloadMedia(client, msg, media.mimeType);
    if (filePath && media) media.filePath = filePath;
  }

  let senderName: string | undefined;
  let senderPhoto: string | undefined;

  const { senderId, entity } = resolveMessageAuthor(msg, chatEntity);

  // Fall back to a lookup only when the response did not carry the user with it.
  let author = entity;
  if (!author && msg.fromId instanceof Api.PeerUser) {
    try {
      const user = await client.getEntity(msg.fromId.userId);
      if (user instanceof Api.User) author = user;
    } catch (error) {
      console.error(`Failed to resolve sender ${senderId}:`, error);
    }
  }

  if (author instanceof Api.User) {
    const { name, photo } = await describeUser(client, author, skipMediaDownload);
    senderName = name;
    senderPhoto = photo;
  } else if (author instanceof Api.Channel) {
    senderName = author.title;
    if (!skipMediaDownload && author.photo && "photoId" in author.photo) {
      senderPhoto = await downloadProfilePhoto(client, author, author.id.toString(), "channel");
    }
  }

  const { text, markdown } = renderMessageContent(msg);

  return {
    id: msg.id,
    text,
    markdown,
    date: new Date(msg.date * 1000),
    media,
    senderId,
    senderName,
    senderPhoto,
  };
}

export async function getSavedMessages(options: GetSavedMessagesOptions): Promise<SavedMessage[]> {
  const { config, limit = 50, searchQuery, skipMediaDownload = false } = options;

  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  const userId = await LocalStorage.getItem<string>(USER_ID_KEY);
  if (!userId) {
    throw new Error("User ID not found. Please authenticate first.");
  }

  const messages = await client.getMessages("me", {
    limit,
    search: searchQuery || undefined,
  });

  const filteredMessages = messages.filter(hasRenderableContent);

  const processedMessages = await Promise.all(
    filteredMessages.map((msg) => processSavedMessage(client, msg, skipMediaDownload)),
  );

  return processedMessages;
}

export async function getChatMessages(options: GetMessagesOptions): Promise<ChatMessage[]> {
  const { config, chatId, limit = 50, searchQuery, skipMediaDownload = false } = options;

  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  const messages = await client.getMessages(chatId, {
    limit,
    search: searchQuery || undefined,
  });

  const filteredMessages = messages.filter(hasRenderableContent);

  // Get the chat entity to know who the chat partner is
  const entity = await client.getEntity(chatId);
  const chatEntity =
    entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel ? entity : undefined;

  const processedMessages = await Promise.all(
    filteredMessages.map((msg) => processChatMessage(client, msg, skipMediaDownload, chatEntity)),
  );

  return processedMessages;
}

export async function getChats(options: GetChatsOptions): Promise<Chat[]> {
  const { config, limit = 50, skipPhotoDownload = false } = options;

  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  const dialogs = await client.getDialogs({ limit });

  const chats: Chat[] = await Promise.all(
    dialogs.map(async (dialog) => {
      const entity = dialog.entity;
      let title = "";
      let type: ChatType = "group";
      let photo: string | undefined;

      if (entity instanceof Api.User) {
        title = entity.firstName || "";
        if (entity.lastName) title += ` ${entity.lastName}`;

        if (entity.deleted) {
          title = "Deleted Account";
        } else if (!title.trim()) {
          title = "Unknown User";
        }

        type = "private";
        if (!skipPhotoDownload && entity.photo && "photoId" in entity.photo) {
          photo = await downloadProfilePhoto(client, entity, entity.id.toString(), "profile");
        }
      } else if (entity instanceof Api.Chat) {
        title = entity.title;
        type = "group";
        if (!skipPhotoDownload && entity.photo && "photoId" in entity.photo) {
          photo = await downloadProfilePhoto(client, entity, entity.id.toString(), "chat");
        }
      } else if (entity instanceof Api.Channel) {
        title = entity.title;
        type = "group";
        if (!skipPhotoDownload && entity.photo && "photoId" in entity.photo) {
          photo = await downloadProfilePhoto(client, entity, entity.id.toString(), "channel");
        }
      }

      let lastMessage: ChatMessage | undefined;

      if (dialog.message) {
        const chatEntityForMessage =
          entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel
            ? entity
            : undefined;
        lastMessage = await processChatMessage(client, dialog.message, skipPhotoDownload, chatEntityForMessage);
      }

      return {
        id: dialog.id?.toString() || "",
        title,
        type,
        lastMessage,
        unreadCount: dialog.unreadCount,
        photo,
        isPinned: dialog.pinned || false,
      };
    }),
  );

  return chats;
}

export async function getChatById(config: TelegramConfig, chatId: string): Promise<Chat | null> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  try {
    const entity = await client.getEntity(chatId);
    let title = "";
    let type: ChatType = "group";

    if (entity instanceof Api.User) {
      title = entity.firstName || "";
      if (entity.lastName) title += ` ${entity.lastName}`;

      if (entity.deleted) {
        title = "Deleted Account";
      } else if (!title.trim()) {
        title = "Unknown User";
      }

      type = "private";
    } else if (entity instanceof Api.Chat) {
      title = entity.title;
      type = "group";
    } else if (entity instanceof Api.Channel) {
      title = entity.title;
      type = "group";
    }

    return {
      id: chatId,
      title,
      type,
      unreadCount: 0,
      isPinned: false,
    };
  } catch (error) {
    console.error("Failed to get chat by ID:", error);
    return null;
  }
}

export async function sendMessage(options: SendMessageOptions): Promise<void> {
  const { config, chatId, message, filePaths } = options;

  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  const files = filePaths ? (Array.isArray(filePaths) ? filePaths : [filePaths]) : [];

  if (files.length === 0) {
    await client.sendMessage(chatId, { message });
    return;
  }

  // Send message with first file (Telegram API limitation - one file per message)
  await client.sendMessage(chatId, {
    message,
    file: files[0],
  });

  // If there are more files, send them in separate messages
  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      await client.sendMessage(chatId, {
        message: "",
        file: files[i],
      });
    }
  }
}
