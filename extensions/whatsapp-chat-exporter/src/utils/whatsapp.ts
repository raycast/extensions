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

      return values.map((row: (string | number | null)[]) => {
        const rowObj: Record<string, string | number | null> = {};
        columns.forEach((col: string, idx: number) => {
          rowObj[col] = row[idx];
        });

        return {
          id: String(rowObj.Z_PK), // We use the internal PK for joining with messages
          name: rowObj.ZPARTNERNAME || rowObj.ZCONTACTJID,
          unreadCount: rowObj.ZUNREADCOUNT || 0,
          lastMessageDate: (rowObj.ZLASTMESSAGEDATE + CORE_DATA_OFFSET) * 1000,
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

    return values.map((row: (string | number | null)[]) => {
      const rowObj: Record<string, string | number | null> = {};
      columns.forEach((col: string, idx: number) => {
        rowObj[col] = row[idx];
      });

      // Determine sender name with priority:
      // 1. For group chats: Profile push name from group member's JID
      // 2. For direct chats: Profile push name from message's ZFROMJID
      // 3. Decoded message push name
      // 4. Extract from member JID or message JID as fallback
      const senderName =
        rowObj.ZPROFILEPUSHNAME ||
        rowObj.ZDIRECTPUSHNAME ||
        this.decodePushName(rowObj.ZPUSHNAME) ||
        this.extractNameFromJID(rowObj.ZGROUPMEMBERJID) ||
        this.extractNameFromJID(rowObj.ZFROMJID);

      const baseMessage: Message = {
        id: `${chatPk}-${rowObj.ZMESSAGEDATE}`,
        text: rowObj.ZTEXT,
        date: (rowObj.ZMESSAGEDATE + CORE_DATA_OFFSET) * 1000,
        isFromMe: rowObj.ZISFROMME === 1,
        hasMedia: !!rowObj.ZMEDIAITEM,
        senderName: senderName,
      };

      if (includeMediaInfo && rowObj.ZMEDIAITEM) {
        // Build MediaInfo object
        const mediaInfo: MediaInfo = {
          localPath: rowObj.ZMEDIALOCALPATH || undefined,
          thumbnailPath: rowObj.ZTHUMBNAILLOCALPATH || undefined,
          url: rowObj.ZMEDIAURL || undefined,
          fileSize: rowObj.ZFILESIZE || undefined,
          title: rowObj.ZTITLE || rowObj.ZVCARDNAME || undefined,
          duration: rowObj.ZMOVIEDURATION || undefined,
          mediaType: rowObj.ZVCARDSTRING
            ? MediaType.VCARD
            : this.getMediaType(rowObj.ZMEDIALOCALPATH || ""),
          isAvailable: false, // Will be checked during export
        };

        baseMessage.mediaInfo = mediaInfo;

        // Set mediaPath for backward compatibility
        if (rowObj.ZMEDIALOCALPATH) {
          baseMessage.mediaPath = rowObj.ZMEDIALOCALPATH;
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
