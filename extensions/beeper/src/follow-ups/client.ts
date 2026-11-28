import { getPreferenceValues } from "@raycast/api";
import { getBeeperDesktop, listChatMessages, retrieveChat, searchChats } from "../api";
import type { Chat, ReplyClient } from "./core";

export function followUpSettings(): { days: number; includeMuted: boolean } {
  // Both Awaiting Reply commands declare the same preferences.
  const prefs = getPreferenceValues<Preferences.AwaitingReply | Preferences.AwaitingReplyMenuBar>();
  const days = Number(prefs.lookbackDays);
  return { days: [7, 14, 30].includes(days) ? days : 14, includeMuted: prefs.includeMuted === true };
}

/** Adapts this extension's Beeper API helpers to the reply-queue scanner. */
export function followUpClient(): ReplyClient {
  return {
    searchChats: async (params) => {
      const page = await searchChats(params);
      return { items: page.items as Chat[], hasMore: page.hasMore ?? false, oldestCursor: page.oldestCursor ?? null };
    },
    listMessages: async (chatID, params) => {
      const page = await listChatMessages(chatID, params);
      return { items: page.items, hasMore: page.hasMore ?? false, oldestCursor: page.oldestCursor ?? null };
    },
    retrieveChat: (chatID, params) => retrieveChat(chatID, params) as Promise<Chat>,
    // A lost response can follow a successful draft prefill. Do not replay it.
    focus: (params) => getBeeperDesktop().focus(params, { maxRetries: 0 }),
  };
}
