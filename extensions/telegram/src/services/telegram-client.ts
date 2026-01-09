import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { LocalStorage, environment } from "@raycast/api";
import { Api } from "telegram/tl";
import * as fs from "fs";
import * as path from "path";

const SESSION_KEY = "telegram_session";
const USER_ID_KEY = "telegram_user_id";
const PHONE_CODE_HASH_KEY = "telegram_phone_code_hash";
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
  date: Date;
  media?: MessageMedia;
}

export interface ChatMessage {
  id: number;
  text: string;
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
  phoneNumber: string;
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

let clientInstance: TelegramClient | null = null;

export async function getClient(config: TelegramConfig): Promise<TelegramClient> {
  if (clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  const sessionString = await LocalStorage.getItem<string>(SESSION_KEY);
  const session = new StringSession(sessionString || "");

  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  clientInstance = client;
  return client;
}

export async function isAuthenticated(): Promise<boolean> {
  const sessionString = await LocalStorage.getItem<string>(SESSION_KEY);
  return !!sessionString;
}

export async function authenticate(config: TelegramConfig, code?: string): Promise<{ needsCode: boolean }> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  if (await client.isUserAuthorized()) {
    return { needsCode: false };
  }

  if (!code) {
    const phoneCodeHash = await LocalStorage.getItem<string>(PHONE_CODE_HASH_KEY);
    if (!phoneCodeHash) {
      const result = await client.sendCode(
        {
          apiId: config.apiId,
          apiHash: config.apiHash,
        },
        config.phoneNumber,
      );
      await LocalStorage.setItem(PHONE_CODE_HASH_KEY, result.phoneCodeHash);
      return { needsCode: true };
    }
    return { needsCode: true };
  }

  const phoneCodeHash = await LocalStorage.getItem<string>(PHONE_CODE_HASH_KEY);
  if (!phoneCodeHash) {
    throw new Error("Phone code hash not found. Please restart authentication.");
  }

  await client.invoke(
    new Api.auth.SignIn({
      phoneNumber: config.phoneNumber,
      phoneCodeHash: phoneCodeHash,
      phoneCode: code,
    }),
  );

  const session = client.session.save() as unknown as string;
  await LocalStorage.setItem(SESSION_KEY, session);

  const me = await client.getMe();
  await LocalStorage.setItem(USER_ID_KEY, me.id.toString());

  await LocalStorage.removeItem(PHONE_CODE_HASH_KEY);

  return { needsCode: false };
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

function parseMessageMedia(msg: Api.Message): MessageMedia | undefined {
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

  return {
    id: msg.id,
    text: msg.message || "",
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

  let senderId: string | undefined;
  let senderName: string | undefined;
  let senderPhoto: string | undefined;

  // Try to get sender info from fromId
  if (msg.fromId && msg.fromId instanceof Api.PeerUser) {
    senderId = msg.fromId.userId.toString();
    try {
      const user = await client.getEntity(msg.fromId.userId);
      if (user instanceof Api.User) {
        senderName = user.firstName || "";
        if (user.lastName) senderName += ` ${user.lastName}`;

        if (user.deleted) {
          senderName = "Deleted Account";
        } else if (!senderName.trim()) {
          senderName = "Unknown User";
        }

        if (!skipMediaDownload && user.photo && "photoId" in user.photo) {
          senderPhoto = await downloadProfilePhoto(client, user, user.id.toString(), "profile");
        }
      }
    } catch (error) {
      console.error("Failed to get sender info:", error);
      senderName = "Unknown User";
    }
  } else if (!msg.fromId && chatEntity instanceof Api.User) {
    // For private chats, if there's no fromId, assume it's from the chat partner
    senderId = chatEntity.id.toString();
    senderName = chatEntity.firstName || "";
    if (chatEntity.lastName) senderName += ` ${chatEntity.lastName}`;

    if (chatEntity.deleted) {
      senderName = "Deleted Account";
    } else if (!senderName.trim()) {
      senderName = "Unknown User";
    }

    if (!skipMediaDownload && chatEntity.photo && "photoId" in chatEntity.photo) {
      senderPhoto = await downloadProfilePhoto(client, chatEntity, chatEntity.id.toString(), "profile");
    }
  }

  return {
    id: msg.id,
    text: msg.message || "",
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

  const filteredMessages = messages.filter((msg) => msg.message || msg.media);

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

  const filteredMessages = messages.filter((msg) => msg.message || msg.media);

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
