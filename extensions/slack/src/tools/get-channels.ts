import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

async function getChannels() {
  const slackWebClient = getSlackWebClient();
  const channels = await slackWebClient.conversations.list({
    exclude_archived: true,
    types: "public_channel,private_channel",
    limit: 1000,
  });

  if (channels.error) {
    throw new Error(channels.error);
  }

  return channels.channels?.map((c) => ({
    id: c.id,
    name: c.name,
    purpose: c.purpose?.value,
    topic: c.topic?.value,
  }));
}

export default withSlackClient(getChannels);
