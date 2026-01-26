export interface Chat {
  id: string;
  name: string;
  unreadCount: number;
  lastMessageDate: number;
}

export interface Message {
  id: string;
  text: string;
  date: number;
  isFromMe: boolean;
  senderName?: string; // For group chats
  mediaPath?: string;
  hasMedia: boolean;
  mediaInfo?: MediaInfo;
}

export interface MediaInfo {
  localPath?: string;
  thumbnailPath?: string;
  url?: string;
  fileSize?: number;
  title?: string;
  duration?: number;
  mediaType: MediaType;
  exportedPath?: string;
  exportedThumbnailPath?: string;
  isAvailable: boolean;
}

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  VCARD = "vcard",
  UNKNOWN = "unknown",
}

export type ExportFormat = "json" | "markdown";
