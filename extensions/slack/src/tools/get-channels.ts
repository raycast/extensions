import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type ResponseGetChannels = {
  id?: string;
  name?: string;
  purpose?: string;
  topic?: string;
};

async function getChannels() {
  const slackWebClient = getSlackWebClient();
  const allChannels: ResponseGetChannels[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "public_channel,private_channel",
      limit: 1000,
      cursor: cursor,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const currentChannels =
      response.channels?.map((channel) => ({
        id: channel.id,
        name: channel.name,
        purpose: channel.purpose?.value,
        topic: channel.topic?.value,
      })) || [];

    allChannels.push(...currentChannels);
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return allChannels;
}

export default withSlackClient(getChannels);
