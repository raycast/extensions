import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

async function getEmojis() {
  const slackWebClient = getSlackWebClient();
  const emojis = await slackWebClient.emoji.list();

  if (emojis.error) {
    throw new Error(emojis.error);
  }

  return emojis.emoji;
}

export default withSlackClient(getEmojis);
