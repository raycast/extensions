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

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
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

  // Check if already authorized
  if (await client.checkAuthorization()) {
    return { needsCode: false };
  }

  // Start auth process
  if (!code) {
    const result = await client.sendCode(
      {
        apiId: config.apiId,
        apiHash: config.apiHash,
      },
      config.phoneNumber,
    );
    // Store phone code hash for later use
    await LocalStorage.setItem(PHONE_CODE_HASH_KEY, result.phoneCodeHash);
    return { needsCode: true };
  }

  // Complete auth with code
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

  // Save session
  const sessionString = (client.session as StringSession).save();
  await LocalStorage.setItem(SESSION_KEY, sessionString);

  // Get and save user ID
  const me = await client.getMe();
  await LocalStorage.setItem(USER_ID_KEY, me.id.toString());

  return { needsCode: false };
}

async function downloadMedia(
  client: TelegramClient,
  message: Api.Message,
  mimeType?: string,
): Promise<string | undefined> {
  try {
    // Ensure media cache directory exists
    if (!fs.existsSync(MEDIA_CACHE_DIR)) {
      fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
    }

    // Determine file extension from mime type
    let extension = "";
    if (mimeType) {
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
      extension = mimeToExt[mimeType] || "";
    }

    // Generate a unique filename based on message ID
    const fileName = `${message.id}_${Date.now()}${extension}`;
    const filePath = path.join(MEDIA_CACHE_DIR, fileName);

    // Download the media
    const buffer = await client.downloadMedia(message, { outputFile: filePath });

    if (buffer) {
      return filePath;
    }
  } catch (error) {
    console.error("Failed to download media:", error);
  }

  return undefined;
}

export async function getSavedMessages(
  config: TelegramConfig,
  limit = 50,
  searchQuery?: string,
): Promise<SavedMessage[]> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  // Get user ID (Saved Messages is a chat with yourself)
  const userId = await LocalStorage.getItem<string>(USER_ID_KEY);
  if (!userId) {
    throw new Error("User ID not found. Please authenticate first.");
  }

  // Get messages from Saved Messages with optional search
  const messages = await client.getMessages("me", {
    limit,
    search: searchQuery || undefined,
  });

  const filteredMessages = messages.filter((msg) => msg.message || msg.media);

  // Process messages and download media
  const processedMessages = await Promise.all(
    filteredMessages.map(async (msg) => {
      let media: MessageMedia | undefined;

      if (msg.media) {
        const mediaClassName = msg.media.className;

        if (mediaClassName === "MessageMediaPhoto") {
          const photo = msg.media as Api.MessageMediaPhoto;
          const photoObj = photo.photo;
          if (photoObj && "sizes" in photoObj) {
            const largestSize = photoObj.sizes[photoObj.sizes.length - 1];
            media = {
              type: "photo",
              mimeType: "image/jpeg", // Telegram photos are typically JPEG
              width: "w" in largestSize ? largestSize.w : undefined,
              height: "h" in largestSize ? largestSize.h : undefined,
            };
          } else {
            media = { type: "photo", mimeType: "image/jpeg" };
          }
        } else if (mediaClassName === "MessageMediaDocument") {
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

            media = {
              type,
              fileName,
              fileSize: Number(document.size),
              mimeType,
              duration,
              width,
              height,
            };
          } else {
            media = { type: "document" };
          }
        } else if (mediaClassName === "MessageMediaWebPage") {
          media = { type: "link" };
        } else if (mediaClassName === "MessageMediaGeo" || mediaClassName === "MessageMediaVenue") {
          media = { type: "location" };
        } else if (mediaClassName === "MessageMediaContact") {
          media = { type: "contact" };
        } else if (mediaClassName === "MessageMediaPoll") {
          media = { type: "poll" };
        } else {
          media = { type: "unknown" };
        }
      }

      // Download media for photos, images, videos, and gifs
      if (media && ["photo", "image", "video", "gif"].includes(media.type)) {
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
    }),
  );

  return processedMessages;
}

export async function sendSavedMessage(config: TelegramConfig, text: string): Promise<void> {
  const client = await getClient(config);

  if (!client.connected) {
    await client.connect();
  }

  // Send message to "me" (Saved Messages)
  await client.sendMessage("me", { message: text });
}

export async function disconnect(): Promise<void> {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
}

export async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
  await LocalStorage.removeItem(USER_ID_KEY);
  await LocalStorage.removeItem(PHONE_CODE_HASH_KEY);
  await disconnect();
}
