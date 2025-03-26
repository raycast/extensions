import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { handleError } from "../shared/utils";

type Input = {
  /**
   * The ID of the channel containing the thread (e.g., C12345678)
   */
  channelId: string;
  /**
   * The timestamp of the parent message in the thread (e.g., 1234567890.123456)
   */
  threadTs: string;
};

/**
 * Retrieve all messages in a Slack thread by its channel ID and thread timestamp
 */
async function getThreadMessages(input: Input) {
  const slackWebClient = getSlackWebClient();

  try {
    const result = await slackWebClient.conversations.replies({
      channel: input.channelId,
      ts: input.threadTs,
    });

    if (!result.messages || result.messages.length === 0) {
      return { success: false, message: "No messages found in thread" };
    }

    const messages = result.messages.map(message => ({
      text: message.text || "",
      sender: message.user || message.bot_id || "",
      timestamp: message.ts || "",
      threadTs: message.thread_ts || message.ts || "",
      replyCount: message.reply_count,
      replyUsersCount: message.reply_users_count,
      receivedAt: message.ts ? new Date(parseFloat(message.ts) * 1000).toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      messages,
      count: messages.length,
      parentMessage: messages[0]
    };
  } catch (error) {
    handleError(error);
    return { success: false, message: "Error retrieving thread messages", error: String(error) };
  }
}

export default withSlackClient(getThreadMessages);