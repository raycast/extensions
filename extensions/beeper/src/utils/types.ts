/**
 * Connected account in Beeper
 */
export interface BeeperAccount {
  id: string;
  service: string;
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
  service: string;
  accountId: string;
  type: "single" | "group" | "space";
  lastMessageAt?: string;
  avatarUrl?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}
