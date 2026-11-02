import { loadConversationDirectoryPage, loadMemberChannelDirectoryPage } from "../shared/client/SlackClient";
import { searchChannelMentions } from "../shared/client/channelMentions";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /** What the user typed in the Channels mention search, empty for the default list. */
  query: string;
};

async function searchChannels(input: Input) {
  return searchChannelMentions(input.query, {
    loadMemberChannelsPage: loadMemberChannelDirectoryPage,
    loadChannelsPage: loadConversationDirectoryPage,
  });
}

export default withSlackClient(searchChannels);
