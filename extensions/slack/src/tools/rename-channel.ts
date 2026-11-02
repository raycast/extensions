import { Tool } from "@raycast/api";
import { getSlackWebClient } from "../shared/client/WebClient";
import { normalizeChannelName, parseChannelId, renameChannel } from "../shared/client/renameChannel";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * The ID of the Slack channel to rename. Channel IDs start with C or G and can be found with Get Channels.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * The new channel name, without the leading #. Slack channel names are lowercase and use hyphens instead of
   * spaces; uppercase letters and spaces are converted automatically. Maximum 80 characters.
   *
   * @example "project-launch"
   */
  name: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const channel = parseChannelId(input.channel);
  const name = normalizeChannelName(input.name);
  return {
    message: `Rename this channel to #${name}?`,
    info: [
      { name: "Channel", value: channel },
      { name: "New Name", value: `#${name}` },
    ],
  };
};

async function renameChannelTool(input: Input) {
  const slackWebClient = getSlackWebClient();
  return renameChannel(input.channel, input.name, (args) => slackWebClient.conversations.rename(args));
}

export default withSlackClient(renameChannelTool);
