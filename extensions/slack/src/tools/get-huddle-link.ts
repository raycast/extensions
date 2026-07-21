import { getSlackWebClient, SlackConversation } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

function getWorkspaceId(conversation: SlackConversation, fallbackTeamId: string): string {
  const teamIds = [
    ...(conversation.internal_team_ids ?? []),
    ...(conversation.shared_team_ids ?? []),
    ...(conversation.context_team_id ? [conversation.context_team_id] : []),
  ];

  return teamIds[0] ?? fallbackTeamId;
}

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

  const [conversationResponse, authResponse] = await Promise.all([
    slackWebClient.conversations.info({ channel }),
    slackWebClient.auth.test(),
  ]);

  if (conversationResponse.error) {
    throw new Error(conversationResponse.error);
  }
  if (!conversationResponse.channel) {
    throw new Error("Slack did not return conversation info");
  }
  if (authResponse.error) {
    throw new Error(authResponse.error);
  }
  if (!authResponse.team_id) {
    throw new Error("Slack did not return a workspace ID");
  }

  const workspaceId = getWorkspaceId(conversationResponse.channel, authResponse.team_id);

  return {
    workspaceId,
    channel,
    url: `https://app.slack.com/huddle/${workspaceId}/${channel}`,
  };
}

export default withSlackClient(getHuddleLink);
