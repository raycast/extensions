import { Tool } from "@raycast/api";
import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * Slack channel IDs to archive, one per line. Channel IDs start with C or G and can be found with Get Channels.
   *
   * @example "C12345678\nC87654321"
   */
  channels: string;
};

function parseChannelIds(channels: string) {
  const ids = [
    ...new Set(
      channels
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) {
    throw new Error("Provide at least one channel ID");
  }

  const invalid = ids.filter((id) => !/^[CG][A-Z0-9]{8,}$/.test(id));
  if (invalid.length > 0) {
    throw new Error(`Invalid Slack channel IDs: ${invalid.join(", ")}`);
  }

  return ids;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const ids = parseChannelIds(input.channels);
  return {
    message: `Archive ${ids.length === 1 ? "this channel" : `these ${ids.length} channels`}?`,
    info: [{ name: "Channels", value: ids.join(", ") }],
  };
};

async function archiveChannels(input: Input) {
  const ids = parseChannelIds(input.channels);
  const slackWebClient = getSlackWebClient();

  const results = [];
  for (const id of ids) {
    try {
      const response = await slackWebClient.conversations.archive({ channel: id });
      results.push({ channel: id, archived: response.ok, error: response.error });
    } catch (error) {
      const slackError = (error as { data?: { error?: string } }).data?.error;
      results.push({
        channel: id,
        archived: slackError === "already_archived",
        error: slackError ?? (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  return results;
}

export default withSlackClient(archiveChannels);
