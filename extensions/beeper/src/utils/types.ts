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
  | "line"
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
  isSelfHosted?: boolean;
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
    line: "line",
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

/**
 * Extract service name from an accountID string.
 * Handles formats like "local-whatsapp_ba_...", "sh-line-m", etc.
 */
export function parseServiceFromAccountID(accountID: string): BeeperService {
  if (!accountID) return "unknown";

  // Matrix/Beeper accounts: "user:beeper.com", "user:beeper.local", or "hungryserv-*"
  if (accountID.includes(":beeper.com") || accountID.includes(":beeper.local") || accountID.startsWith("hungryserv")) {
    return "matrix";
  }

  // Strip common prefixes: "local-", "sh-"
  const stripped = accountID.replace(/^(local-|sh-)/, "");
  // Take the part before the first delimiter (e.g., "whatsapp" from "whatsapp_ba_...",
  // "slackgo" from "slackgo.T01...", "line" from "line-m")
  const servicePart = stripped.split(/[_.]/)[0];
  // Strip "go" bridge suffix (e.g., "discordgo" → "discord", "facebookgo" → "facebook")
  const cleaned = servicePart.replace(/go$/, "");

  return parseService(cleaned || servicePart);
}
