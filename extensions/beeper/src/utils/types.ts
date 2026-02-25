/**
 * Supported messaging services in Beeper
 */
export type BeeperService =
  | "whatsapp"
  | "telegram"
  | "signal"
  | "instagram"
  | "messenger"
  | "discord"
  | "slack"
  | "linkedin"
  | "twitter"
  | "googlechat"
  | "googlemessages"
  | "googlevoice"
  | "sms"
  | "imessage"
  | "matrix"
  | "unknown";

/**
 * Connected account in Beeper
 */
export interface BeeperAccount {
  id: string;
  service: BeeperService;
  displayName: string;
  isConnected: boolean;
  username?: string;
}

/**
 * Chat/conversation in Beeper
 */
export interface BeeperChat {
  id: string;
  name: string;
  service: BeeperService;
  accountId: string;
  type: "single" | "group" | "space";
  lastMessageAt?: string;
  avatarUrl?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

/**
 * Message in Beeper
 */
export interface BeeperMessage {
  id: string;
  chatId: string;
  content: string;
  sender: string;
  senderName?: string;
  timestamp: string;
  service: BeeperService;
}

/**
 * Search result from Beeper API
 */
export interface BeeperSearchResult {
  chats: BeeperChat[];
  messages: BeeperMessage[];
}

/**
 * Extract service type from account ID or service string
 */
export function parseService(serviceString: string | undefined): BeeperService {
  if (!serviceString) return "unknown";

  const normalized = serviceString.toLowerCase();

  const serviceMap: Record<string, BeeperService> = {
    whatsapp: "whatsapp",
    telegram: "telegram",
    signal: "signal",
    instagram: "instagram",
    messenger: "messenger",
    facebook: "messenger",
    discord: "discord",
    slack: "slack",
    linkedin: "linkedin",
    twitter: "twitter",
    x: "twitter",
    googlechat: "googlechat",
    "google-chat": "googlechat",
    googlemessages: "googlemessages",
    "google-messages": "googlemessages",
    gmessages: "googlemessages",
    "g-messages": "googlemessages",
    androidsms: "googlemessages",
    android: "googlemessages",
    rcs: "googlemessages",
    messages: "googlemessages",
    "google messages": "googlemessages",
    texts: "googlemessages",
    googlevoice: "googlevoice",
    "google-voice": "googlevoice",
    sms: "sms",
    imessage: "imessage",
    matrix: "matrix",
    "beeper (matrix)": "matrix",
    beeper: "matrix",
  };

  if (serviceMap[normalized]) {
    return serviceMap[normalized];
  }

  for (const [key, value] of Object.entries(serviceMap)) {
    if (key.length >= 3 && normalized.startsWith(key)) {
      return value;
    }
  }

  return "unknown";
}
