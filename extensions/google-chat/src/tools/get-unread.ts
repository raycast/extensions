import { getPreferenceValues } from "@raycast/api";

import { withGoogleAuth } from "../api/google";
import { getUnread } from "../api/unread";
import { toolMessage, toolSpace } from "../helpers/ai";
import { countLabel, parseLookbackDays } from "../helpers/unread";

const MESSAGES_PER_CONVERSATION = 20;

/**
 * Gets the user's unread messages, from Google Chat's own unread state, grouped by conversation
 * (newest unread first), with the total count and up to 20 unread messages per conversation.
 */
async function getUnreadMessages() {
  const days = parseLookbackDays(getPreferenceValues<Preferences>().unreadLookbackDays);
  const unread = await getUnread(days, { maxAgeMs: 0 });
  return {
    lookbackDays: days,
    totalUnread: countLabel(unread.total, unread.capped),
    conversationsWithUnread: unread.spaces.length,
    mentionsMe: unread.spaces.some((entry) => entry.mentioned),
    conversations: unread.spaces.map((entry) => ({
      ...toolSpace(entry.item),
      mentionsMe: entry.mentioned,
      unreadCount: entry.count,
      messages: entry.messages
        .slice(0, MESSAGES_PER_CONVERSATION)
        .map((message) => ({ ...toolMessage(message, entry.item), mentionsMe: entry.mentions.includes(message.name) })),
    })),
  };
}

export default withGoogleAuth(getUnreadMessages);
