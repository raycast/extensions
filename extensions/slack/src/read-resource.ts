import { getSlackWebClient } from "./shared/client/WebClient";
import { readChannelMention } from "./shared/client/channelMentions";
import { readUserMention } from "./shared/client/userMentions";
import { withSlackClient } from "./shared/withSlackClient";

type Input = {
  /** The URI of a person or channel selected from Slack's Users or Channels mention search. */
  uri: string;
};

async function readResource({ uri }: Input) {
  const client = getSlackWebClient();
  if (uri.startsWith("slack://users/")) {
    return readUserMention(uri, (user) => client.users.info({ user }));
  }
  if (uri.startsWith("slack://channels/")) {
    return readChannelMention(uri, (channel) => client.conversations.info({ channel, include_num_members: true }));
  }
  throw new Error("Unsupported Slack mention URI.");
}

export default withSlackClient(readResource);
