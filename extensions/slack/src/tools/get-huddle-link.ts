import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * A Slack conversation ID or user ID. Conversation IDs start with C, D, or G. User IDs start with U or W and are resolved to a direct-message conversation.
   *
   * @example "C12345678"
   */
  conversation: string;
};

const CONVERSATION_ID_PATTERN = /^[CDG][A-Z0-9]{8,}$/;
const USER_ID_PATTERN = /^[UW][A-Z0-9]{8,}$/;

async function getHuddleLink(input: Input) {
  const conversation = input.conversation.trim().toUpperCase();
  const slackWebClient = getSlackWebClient();
  let channel: string;

  if (CONVERSATION_ID_PATTERN.test(conversation)) {
    channel = conversation;
  } else if (USER_ID_PATTERN.test(conversation)) {
    const response = await slackWebClient.conversations.open({ users: conversation });

    if (response.error) {
      throw new Error(response.error);
    }
    if (!response.channel?.id) {
      throw new Error("Slack did not return a direct message conversation ID");
    }

    channel = response.channel.id;
  } else {
    throw new Error("Conversation must be a Slack conversation ID or user ID");
  }

  const authResponse = await slackWebClient.auth.test();
  if (authResponse.error) {
    throw new Error(authResponse.error);
  }
  if (!authResponse.team_id) {
    throw new Error("Slack did not return a workspace ID");
  }

  return {
    workspaceId: authResponse.team_id,
    channel,
    url: `https://app.slack.com/huddle/${authResponse.team_id}/${channel}`,
  };
}

export default withSlackClient(getHuddleLink);
