import { getSlackWebClient, SlackConversation } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

function getWorkspaceId(conversation: SlackConversation, fallbackTeamId: string): string {
  const teamIds = [
    ...(conversation.context_team_id ? [conversation.context_team_id] : []),
    ...(conversation.internal_team_ids ?? []),
    ...(conversation.shared_team_ids ?? []),
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
  let dmUserTeamId: string | undefined;

  if (CONVERSATION_ID_PATTERN.test(conversation)) {
    channel = conversation;
  } else if (USER_ID_PATTERN.test(conversation)) {
    const [openResponse, userResponse] = await Promise.all([
      slackWebClient.conversations.open({ users: conversation }),
      slackWebClient.users.info({ user: conversation }),
    ]);

    if (openResponse.error) {
      throw new Error(openResponse.error);
    }
    if (!openResponse.channel?.id) {
      throw new Error("Slack did not return a direct message conversation ID");
    }
    if (userResponse.error) {
      throw new Error(userResponse.error);
    }

    channel = openResponse.channel.id;
    dmUserTeamId = userResponse.user?.team_id;
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
  const channelInfo = conversationResponse.channel as SlackConversation;
  if (authResponse.error) {
    throw new Error(authResponse.error);
  }
  if (!authResponse.team_id) {
    throw new Error("Slack did not return a workspace ID");
  }

  if (!dmUserTeamId && channelInfo.user) {
    const userResponse = await slackWebClient.users.info({ user: channelInfo.user });
    if (userResponse.error) {
      throw new Error(userResponse.error);
    }
    dmUserTeamId = userResponse.user?.team_id;
  }

  const workspaceId = getWorkspaceId(channelInfo, dmUserTeamId ?? authResponse.team_id);

  return {
    workspaceId,
    channel,
    url: `https://app.slack.com/huddle/${workspaceId}/${channel}`,
  };
}

export default withSlackClient(getHuddleLink);
