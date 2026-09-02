import { getMessageActivity } from "../api/get-message-activity";

type Input = {
  /** Include activity at or after this ISO 8601 date-time. */
  from?: string;
  /** Include activity before this ISO 8601 date-time. */
  to?: string;
  /** Calendar grouping for counts. Weeks use the local calendar and begin Monday. */
  interval?: "total" | "day" | "week" | "month" | "year";
  /** Optional comma-separated stable chat GUIDs returned by search-chats. */
  chatGuids?: string;
  /** Include only direct or group chats. */
  chatType?: "direct" | "group";
  /** Return combined activity or a ranked page of chats. */
  breakdown?: "overall" | "chat";
  /** Rank chat results by total, sent, or received count. */
  rankBy?: "total" | "sent" | "received";
  /** Maximum chat rows per page, from 1 to 100. */
  limit?: number;
  /** Opaque nextCursor returned by the previous chat-breakdown call. */
  cursor?: string;
};

export default async function (input: Input) {
  try {
    return await getMessageActivity({
      ...input,
      chatGuids: input.chatGuids
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "Cannot access the Messages database. Grant Raycast Full Disk Access in System Settings → Privacy & Security → Full Disk Access.";
    }
    throw error;
  }
}
