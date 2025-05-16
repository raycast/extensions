import {getSlackWebClient} from "../shared/client/WebClient";
import {withSlackClient} from "../shared/withSlackClient";

async function getChannels() {
  const slackWebClient = getSlackWebClient();
  let allChannels = [];
  let cursor = null;

  do {
    const response = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "public_channel,private_channel",
      limit: 1000,
      cursor: cursor || undefined,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const currentChannels = response.channels?.map((channel) => ({
      id: channel.id,
      name: channel.name,
      purpose: channel.purpose?.value,
      topic: channel.topic?.value,
    })) || [];

    allChannels = allChannels.concat(currentChannels);
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return allChannels;
}



export default withSlackClient(getChannels);
