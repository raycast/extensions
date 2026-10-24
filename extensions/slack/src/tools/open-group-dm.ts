import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * Slack user IDs to include in the group DM, one per line. Do not include the authenticated user; Slack adds them automatically. Use Find Users to resolve names to IDs first.
   *
   * @example "U12345678\nU87654321"
   */
  userIds: string;
};

const USER_ID_PATTERN = /^[UW][A-Z0-9]{8,}$/;
const MIN_GROUP_DM_USERS = 2;
const MAX_GROUP_DM_USERS = 8;

async function openGroupDm(input: Input) {
  const userIds = [
    ...new Set(
      input.userIds
        .split(/[,\s]+/)
        .map((userId) => userId.trim())
        .filter(Boolean),
    ),
  ];

  if (userIds.length < MIN_GROUP_DM_USERS || userIds.length > MAX_GROUP_DM_USERS) {
    throw new Error(`A group DM requires ${MIN_GROUP_DM_USERS} to ${MAX_GROUP_DM_USERS} other users`);
  }

  const invalidUserId = userIds.find((userId) => !USER_ID_PATTERN.test(userId));
  if (invalidUserId) {
    throw new Error(`Invalid Slack user ID: ${invalidUserId}`);
  }

  const slackWebClient = getSlackWebClient();
  const response = await slackWebClient.conversations.open({ users: userIds.join(",") });

  if (response.error) {
    throw new Error(response.error);
  }
  if (!response.channel?.id) {
    throw new Error("Slack did not return a group DM conversation ID");
  }

  return {
    channel: response.channel.id,
    userIds,
  };
}

export default withSlackClient(openGroupDm);
