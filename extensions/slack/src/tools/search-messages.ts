import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  query: string;
  sort?: "timestamp" | "score";
};

type ResponseSearchMessages = {
  channelId?: string;
  channelName?: string;
  timestamp?: number;
  time?: string;
  userName?: string;
  user?: string;
  score?: number;
  message?: string;
  messageId?: string;
  permalink?: string;
};

async function searchMessages(input: Input) {
  const slackWebClient = getSlackWebClient();
  const allMessages: ResponseSearchMessages[] = [];
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
        const time: { timestamp?: number; time?: string } = (() => {
          if (matchedMessage?.ts?.toString()?.includes(".")) {
            const timestamp = parseInt(`${matchedMessage?.ts?.toString().split(".")[0]}000`);
            return {
              timestamp: timestamp,
              time: new Date(timestamp).toString(),
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
          timestamp: time.timestamp,
          time: time.time,
          userName: matchedMessage?.username,
          user: matchedMessage?.user,
          score: matchedMessage?.score,
          message: matchedMessage?.text,
          messageId: matchedMessage?.iid,
          permalink: matchedMessage?.permalink,
        };
      }) || [];

    allMessages.push(...currentMessages);

    const totalPages = response?.messages?.pagination?.page_count ?? 1;
    hasMorePages = page < totalPages;
    page++;
  } while (hasMorePages);

  return allMessages;
}

export default withSlackClient(searchMessages);
