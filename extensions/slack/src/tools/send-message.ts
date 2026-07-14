import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * The recipient's Slack conversation ID or user ID. Conversation IDs start with C, D, or G. User IDs start with U or W.
   * Use Get Channels or Get Users to find the ID. When a user ID is provided, the tool opens or finds the direct message first.
   *
   * @example "C12345678"
   */
  recipient: string;
  /**
   * The message text to send. Slack mrkdwn is supported.
   */
  text: string;
};

const CONVERSATION_ID_PATTERN = /^[CDG][A-Z0-9]{8,}$/;
const USER_ID_PATTERN = /^[UW][A-Z0-9]{8,}$/;

async function getConversationId(recipient: string) {
  if (CONVERSATION_ID_PATTERN.test(recipient)) {
    return recipient;
  }

  if (!USER_ID_PATTERN.test(recipient)) {
    throw new Error("Recipient must be a Slack conversation ID or user ID");
  }

  const slackWebClient = getSlackWebClient();
  const response = await slackWebClient.conversations.open({ users: recipient });

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.channel?.id) {
    throw new Error("Slack did not return a direct message conversation ID");
  }

  return response.channel.id;
}

async function sendMessage(input: Input) {
  const recipient = input.recipient.trim();
  const text = input.text.trim();

  if (!text) {
    throw new Error("Message text cannot be empty");
  }

  const slackWebClient = getSlackWebClient();
  const channel = await getConversationId(recipient);
  const response = await slackWebClient.chat.postMessage({ channel, text });

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.channel || !response.ts) {
    throw new Error("Slack did not return the sent message");
  }

  const permalinkResponse = await slackWebClient.chat.getPermalink({
    channel: response.channel,
    message_ts: response.ts,
  });

  return {
    channel: response.channel,
    ts: response.ts,
    text: response.message?.text ?? text,
    permalink: permalinkResponse.ok ? permalinkResponse.permalink : undefined,
  };
}

export default withSlackClient(sendMessage);
