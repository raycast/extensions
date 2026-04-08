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
  const compactNormalized = normalized.replace(/[^a-z0-9]/g, "");

  const serviceMap: Record<string, BeeperService> = {
    whatsapp: "whatsapp",
    telegram: "telegram",
    signal: "signal",
    instagram: "instagram",
    messenger: "messenger",
    facebook: "messenger",
    discord: "discord",
    slack: "slack",
    slackgo: "slack",
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
    imessagego: "imessage",
    matrix: "matrix",
    "beeper (matrix)": "matrix",
    beeper: "matrix",
  };

  const candidates = new Set<string>([normalized, compactNormalized]);
  const strippedPrefixes = [
    normalized.replace(/^(local|cloud|remote|hungryserv)[-_.]/, ""),
    normalized.replace(/^(local|cloud|remote|hungryserv)/, ""),
  ];

  for (const candidate of strippedPrefixes) {
    if (!candidate) continue;
    candidates.add(candidate);
    candidates.add(candidate.replace(/[^a-z0-9]/g, ""));
  }

  for (const part of normalized.split(/[^a-z0-9]+/).filter(Boolean)) {
    candidates.add(part);
  }

  for (const candidate of candidates) {
    if (serviceMap[candidate]) {
      return serviceMap[candidate];
    }
  }

  for (const candidate of candidates) {
    for (const [key, value] of Object.entries(serviceMap)) {
      const compactKey = key.replace(/[^a-z0-9]/g, "");
      if (compactKey.length >= 3 && candidate.startsWith(compactKey)) {
        return value;
      }
    }
  }

  return "unknown";
}
