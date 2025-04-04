import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { handleError } from "../shared/utils";

type Input = {
  /**
   * The ID of the channel containing the message (e.g., C12345678)
   */
  channelId: string;
  /**
   * The timestamp of the message to retrieve (e.g., 1234567890.123456)
   */
  messageTs: string;
};

/**
 * Retrieve a specific Slack message by its channel ID and timestamp
 */
async function getMessage(input: Input) {
  const slackWebClient = getSlackWebClient();

  try {
    const result = await slackWebClient.conversations.history({
      channel: input.channelId,
      latest: input.messageTs,
      limit: 1,
      inclusive: true,
    });

    if (!result.messages || result.messages.length === 0) {
      return { success: false, message: "Message not found" };
    }

    const message = result.messages[0];
    return {
      success: true,
      message: {
        text: message.text || "",
        sender: message.user || message.bot_id || "",
        timestamp: message.ts || "",
        threadTs: message.thread_ts || message.ts || "",
        replyCount: message.reply_count,
        replyUsersCount: message.reply_users_count,
        receivedAt: message.ts ? new Date(parseFloat(message.ts) * 1000).toISOString() : new Date().toISOString(),
      }
    };
  } catch (error) {
    handleError(error);
    return { success: false, message: "Error retrieving message", error: String(error) };
  }
}

export default withSlackClient(getMessage);