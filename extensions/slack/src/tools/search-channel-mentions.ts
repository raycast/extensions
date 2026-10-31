import { getSlackWebClient } from "../shared/client/WebClient";
import { searchChannelMentions } from "../shared/client/channelMentions";
import { getDirectorySearchPageSize } from "../shared/client/directory";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /** What the user typed in the Channels mention search, empty for the default list. */
  query: string;
};

const CHANNEL_TYPES = "public_channel,private_channel";

async function searchChannels(input: Input) {
  const client = getSlackWebClient();
  return searchChannelMentions(input.query, {
    loadMemberChannelsPage: async (cursor) => {
      const response = await client.users.conversations({
        exclude_archived: true,
        types: CHANNEL_TYPES,
        limit: getDirectorySearchPageSize(),
        cursor,
      });
      return { items: response.channels ?? [], nextCursor: response.response_metadata?.next_cursor };
    },
    loadChannelsPage: async (cursor) => {
      const response = await client.conversations.list({
        exclude_archived: true,
        types: CHANNEL_TYPES,
        limit: getDirectorySearchPageSize(),
        cursor,
      });
      return { items: response.channels ?? [], nextCursor: response.response_metadata?.next_cursor };
    },
  });
}

export default withSlackClient(searchChannels);
