import fs from "fs-extra";
import path from "path";
import os from "os";
import { environment } from "@raycast/api";
import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { Chat, Message, MediaType, MediaInfo } from "../types";

const HOME_DIR = os.homedir();
const DB_PATHS = [
  path.join(
    HOME_DIR,
    "Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite",
  ),
  path.join(
    HOME_DIR,
    "Library/Application Support/WhatsApp/ChatStorage.sqlite",
  ), // Legacy
];

const MEDIA_BASE_PATHS = [
  path.join(
    HOME_DIR,
    "Library/Group Containers/group.net.whatsapp.WhatsApp.shared",
  ),
  path.join(HOME_DIR, "Library/Application Support/WhatsApp"),
];

const CORE_DATA_OFFSET = 978307200;

export class WhatsAppClient {
  private dbPath: string | null = null;
  private db: Database | null = null;
  private mediaBasePath: string | null = null;

  async init() {
    for (const p of DB_PATHS) {
      if (await fs.pathExists(p)) {
        this.dbPath = p;
        break;
      }
    }

    if (!this.dbPath) {
      throw new Error(
        "WhatsApp database not found. Please ensure WhatsApp is installed and you have logged in.",
      );
    }

    try {
      // Initialize sql.js with config to locate WASM file from assets
      const wasmPath = path.join(environment.assetsPath, "sql-wasm.wasm");
      const SQL = await initSqlJs({
        locateFile: () => wasmPath,
      });

      // Read the database file
      const dbBuffer = await fs.readFile(this.dbPath);

      // Create database instance
      this.db = new SQL.Database(new Uint8Array(dbBuffer));
    } catch (error) {
      console.error("Failed to open database:", error);
      throw new Error(
        "Failed to open WhatsApp database. Please ensure Raycast has Full Disk Access (System Settings > Privacy & Security > Full Disk Access).",
      );
    }

    // Discover media base path
    for (const basePath of MEDIA_BASE_PATHS) {
      const mediaDir = path.join(basePath, "Media");
      if (await fs.pathExists(mediaDir)) {
        this.mediaBasePath = basePath;
        break;
      }
    }
  }

  async getChats(): Promise<Chat[]> {
    if (!this.db) await this.init();

    // Note: Schema might vary slightly. This is for the standard macOS WhatsApp (Catalyst/Native).
    // ZWACHATSESSION table usually holds chat sessions.
    try {
      const result = this.db!.exec(`
        SELECT Z_PK, ZCONTACTJID, ZPARTNERNAME, ZLASTMESSAGEDATE, ZUNREADCOUNT
        FROM ZWACHATSESSION
        WHERE ZPARTNERNAME IS NOT NULL
        ORDER BY ZLASTMESSAGEDATE DESC
      `);

      if (!result || result.length === 0) {
        return [];
      }

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row) => {
        const rowObj: Record<string, unknown> = {};
        columns.forEach((col: string, idx: number) => {
          rowObj[col] = row[idx];
        });

        const pk = rowObj.Z_PK;
        const partnerName = rowObj.ZPARTNERNAME;
        const contactJid = rowObj.ZCONTACTJID;
        const unreadCount = rowObj.ZUNREADCOUNT;
        const lastMessageDate = rowObj.ZLASTMESSAGEDATE;

        return {
          id: String(pk),
          name: String(partnerName || contactJid || "Unknown"),
          unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
          lastMessageDate: (Number(lastMessageDate) + CORE_DATA_OFFSET) * 1000,
        };
      });
    } catch (e) {
      console.error("Error fetching chats", e);
      throw new Error(
        "Failed to query chats. Schema might be different or DB is locked.",
      );
    }
  }

  private getMediaType(filePath: string): MediaType {
    if (!filePath) return MediaType.UNKNOWN;

    const ext = path.extname(filePath).toLowerCase();

    const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
    const VIDEO_EXTS = [".mp4", ".mov", ".avi", ".mkv", ".m4v"];
    const AUDIO_EXTS = [".opus", ".m4a", ".mp3", ".aac", ".ogg", ".wav"];
    const DOCUMENT_EXTS = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".zip",
    ];

    if (IMAGE_EXTS.includes(ext)) return MediaType.IMAGE;
    if (VIDEO_EXTS.includes(ext)) return MediaType.VIDEO;
    if (AUDIO_EXTS.includes(ext)) return MediaType.AUDIO;
    if (DOCUMENT_EXTS.includes(ext)) return MediaType.DOCUMENT;

    return MediaType.UNKNOWN;
  }

  private extractNameFromJID(
    jid: string | null | undefined,
  ): string | undefined {
    if (!jid) return undefined;
    // JID format is usually: phonenumber@s.whatsapp.net or phonenumber-timestamp@g.us (for groups)
    // Extract just the phone number part
    const match = jid.match(/^(\+?\d+)/);
    return match ? match[1] : undefined;
  }

  private decodePushName(
    encodedName: string | null | undefined,
  ): string | undefined {
    if (!encodedName) return undefined;

    // WhatsApp sometimes base64-encodes names
    // "IAA=" is a common placeholder that decodes to empty/whitespace
    if (encodedName === "IAA=") return undefined;

    try {
      // Try to decode base64
      const decoded = Buffer.from(encodedName, "base64").toString("utf-8");
      // If decoded string has readable characters, return it
      if (decoded && decoded.length > 0 && /[\w\s]+/.test(decoded)) {
        return decoded.trim();
      }
    } catch (e) {
      // If decode fails, return original (might not be base64)
    }

    // Return original if it looks like a normal name (not base64)
    if (/^[a-zA-Z0-9\s]+$/.test(encodedName)) {
      return encodedName;
    }

    return undefined;
  }

  async getMessages(
    chatPk: number,
    includeMediaInfo = false,
  ): Promise<Message[]> {
    if (!this.db) await this.init();

    let query: string;

    if (includeMediaInfo) {
      query = `
        SELECT
          m.ZTEXT,
          m.ZMESSAGEDATE,
          m.ZISFROMME,
          m.ZMEDIAITEM,
          m.ZPUSHNAME,
          m.ZFROMJID,
          m.Z_PK as MESSAGE_PK,
          groupmember.ZMEMBERJID as ZGROUPMEMBERJID,
          profile.ZPUSHNAME as ZPROFILEPUSHNAME,
          direct_profile.ZPUSHNAME as ZDIRECTPUSHNAME,
          media.ZMEDIALOCALPATH,
          media.ZTHUMBNAILLOCALPATH,
          media.ZMEDIAURL,
          media.ZFILESIZE,
          media.ZTITLE,
          media.ZMOVIEDURATION,
          media.ZVCARDNAME,
          media.ZVCARDSTRING
        FROM ZWAMESSAGE m
        LEFT JOIN ZWAMEDIAITEM media ON m.ZMEDIAITEM = media.Z_PK
        LEFT JOIN ZWAGROUPMEMBER groupmember ON m.ZGROUPMEMBER = groupmember.Z_PK
        LEFT JOIN ZWAPROFILEPUSHNAME profile ON groupmember.ZMEMBERJID = profile.ZJID
        LEFT JOIN ZWAPROFILEPUSHNAME direct_profile ON m.ZFROMJID = direct_profile.ZJID
        WHERE m.ZCHATSESSION = ${chatPk}
        ORDER BY m.ZMESSAGEDATE ASC
      `;
    } else {
      // Original simple query for when media info not needed
      query = `
        SELECT
          m.ZTEXT,
          m.ZMESSAGEDATE,
          m.ZISFROMME,
          m.ZMEDIAITEM,
          m.ZPUSHNAME,
          m.ZFROMJID,
          groupmember.ZMEMBERJID as ZGROUPMEMBERJID,
          profile.ZPUSHNAME as ZPROFILEPUSHNAME,
          direct_profile.ZPUSHNAME as ZDIRECTPUSHNAME
        FROM ZWAMESSAGE m
        LEFT JOIN ZWAGROUPMEMBER groupmember ON m.ZGROUPMEMBER = groupmember.Z_PK
        LEFT JOIN ZWAPROFILEPUSHNAME profile ON groupmember.ZMEMBERJID = profile.ZJID
        LEFT JOIN ZWAPROFILEPUSHNAME direct_profile ON m.ZFROMJID = direct_profile.ZJID
        WHERE m.ZCHATSESSION = ${chatPk}
        ORDER BY m.ZMESSAGEDATE ASC
      `;
    }

    const result = this.db!.exec(query);

    if (!result || result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map((row) => {
      const rowObj: Record<string, unknown> = {};
      columns.forEach((col: string, idx: number) => {
        rowObj[col] = row[idx];
      });

      // Extract and type-cast values
      const messageDate = Number(rowObj.ZMESSAGEDATE);
      const text = rowObj.ZTEXT != null ? String(rowObj.ZTEXT) : "";
      const isFromMe = rowObj.ZISFROMME === 1;
      const hasMedia = !!rowObj.ZMEDIAITEM;

      // Determine sender name with priority
      const profilePushName = rowObj.ZPROFILEPUSHNAME
        ? String(rowObj.ZPROFILEPUSHNAME)
        : undefined;
      const directPushName = rowObj.ZDIRECTPUSHNAME
        ? String(rowObj.ZDIRECTPUSHNAME)
        : undefined;
      const pushName = rowObj.ZPUSHNAME ? String(rowObj.ZPUSHNAME) : undefined;
      const groupMemberJid = rowObj.ZGROUPMEMBERJID
        ? String(rowObj.ZGROUPMEMBERJID)
        : undefined;
      const fromJid = rowObj.ZFROMJID ? String(rowObj.ZFROMJID) : undefined;

      const senderName =
        profilePushName ||
        directPushName ||
        this.decodePushName(pushName) ||
        this.extractNameFromJID(groupMemberJid) ||
        this.extractNameFromJID(fromJid);

      const baseMessage: Message = {
        id: `${chatPk}-${messageDate}`,
        text: text,
        date: (messageDate + CORE_DATA_OFFSET) * 1000,
        isFromMe: isFromMe,
        hasMedia: hasMedia,
        senderName: senderName,
      };

      if (includeMediaInfo && rowObj.ZMEDIAITEM) {
        // Build MediaInfo object
        const localPath = rowObj.ZMEDIALOCALPATH
          ? String(rowObj.ZMEDIALOCALPATH)
          : undefined;
        const thumbnailPath = rowObj.ZTHUMBNAILLOCALPATH
          ? String(rowObj.ZTHUMBNAILLOCALPATH)
          : undefined;
        const url = rowObj.ZMEDIAURL ? String(rowObj.ZMEDIAURL) : undefined;
        const fileSize =
          typeof rowObj.ZFILESIZE === "number" ? rowObj.ZFILESIZE : undefined;
        const title = rowObj.ZTITLE
          ? String(rowObj.ZTITLE)
          : rowObj.ZVCARDNAME
            ? String(rowObj.ZVCARDNAME)
            : undefined;
        const duration =
          typeof rowObj.ZMOVIEDURATION === "number"
            ? rowObj.ZMOVIEDURATION
            : undefined;
        const vcardString = rowObj.ZVCARDSTRING
          ? String(rowObj.ZVCARDSTRING)
          : undefined;

        const mediaInfo: MediaInfo = {
          localPath: localPath,
          thumbnailPath: thumbnailPath,
          url: url,
          fileSize: fileSize,
          title: title,
          duration: duration,
          mediaType: vcardString
            ? MediaType.VCARD
            : this.getMediaType(localPath || ""),
          isAvailable: false, // Will be checked during export
        };

        baseMessage.mediaInfo = mediaInfo;

        // Set mediaPath for backward compatibility
        if (localPath) {
          baseMessage.mediaPath = localPath;
        }
      }

      return baseMessage;
    });
  }

  getMediaBasePath(): string | null {
    return this.mediaBasePath;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
