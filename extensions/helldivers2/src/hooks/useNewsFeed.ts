import { useFetch } from "./useFetch";
import { useWarInfo } from "./useWarInfo";
import { useWarStatus } from "./useWarStatus";

interface NewsFeed {
  id: string;
  published: number;
  message: string;
}

export const useNewsFeed = () => {
  const { isLoading: isInfoLoading, info } = useWarInfo();
  const { isLoading: isStatusLoading, status } = useWarStatus();

  const { isLoading, data } = useFetch(
    isInfoLoading || isStatusLoading
      ? undefined
      : `https://api.live.prod.thehelldiversgame.com/api/NewsFeed/${info?.warId}?maxEntries=1024`,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  return {
    isLoading: isLoading || isInfoLoading || isStatusLoading,
    feed: (data as NewsFeed[] | undefined)?.map((item) => {
      if (!info || !status)
        return {
          ...item,
          publishedDate: undefined,
        };

      const unixEpoch = new Date(0).getTime();
      const gameTime = unixEpoch + (info.startDate + status.time) * 1000;
      const deviation = new Date().getTime() - gameTime;
      const gameStart = unixEpoch + deviation + info.startDate * 1000;

      return {
        ...item,
        publishedDate: new Date(gameStart + item.published * 1000),
      };
    }),
  };
};
