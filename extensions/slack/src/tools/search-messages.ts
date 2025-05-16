import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  query: string;
  sort?: "timestamp" | "score";
};

async function searchMessages(input: Input) {
  const slackWebClient = getSlackWebClient();
  let allMessages = [];
  let page = 1;
  let hasMorePages = false;

  do {
    const response = await slackWebClient.search.messages({
      sort: input.sort ?? "score",
      count: 100,
      query: input.query,
      page: page++,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const currentMessages =
      response.messages?.matches?.map((matchedMessage) => {
        const { timestamp, time } = (() => {
          if (matchedMessage?.ts?.toString()?.includes(".")) {
            return {
              timestamp: Number(`${matchedMessage?.ts?.toString().split(".")[0]}000`),
              time: new Date(Number(`${matchedMessage?.ts?.toString().split(".")[0]}000`)).toString(),
            };
          } else {
            return {
              timestamp: undefined,
              time: undefined,
            };
          }
        })();

        return {
          channelId: matchedMessage?.channel?.id,
          channelName: matchedMessage?.channel?.name,
          timestamp: timestamp,
          time: time,
          userName: matchedMessage?.username,
          user: matchedMessage?.user,
          score: matchedMessage?.score,
          message: matchedMessage?.text,
          messageId: matchedMessage?.iid,
          permalink: matchedMessage?.permalink,
        };
      }) || [];

    allMessages = allMessages.concat(currentMessages);
    hasMorePages = response?.messages?.pagination?.page_count >= page;
  } while (hasMorePages);

  return allMessages;
}

export default withSlackClient(searchMessages);
