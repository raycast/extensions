import { Color, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import Actions from "./actions";
import { Result, Series } from "./types";
import { getDisplaySize, getTimeDifference } from "./util";

const limit = 100;

export default function ListView() {
  // const cancelRef = useRef<AbortController | null>(null);
  // const alreadyCalled = useRef(false);

  const [data, setData] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);

  const loadNextPage = useCallback(
    async (
      nextPage: number,
      // signal?: AbortSignal
    ) => {
      // alreadyCalled.current = true;

      console.log(`https://eztv.tf/api/get-torrents?limit=${limit}&page=${nextPage}`);

      setIsLoading(true);

      try {
        const res = await fetch(
          `https://eztv.tf/api/get-torrents?limit=${limit}&page=${nextPage}`,
          // {
          //   signal,
          // }
        );
        const newData = (await res.json()) as Result;

        // if (signal?.aborted) {
        //   return;
        // }

        for (const item of newData.torrents) {
          item.page = nextPage;
        }

        setData((prev) => [...prev, ...newData.torrents]);
        setHasMore(nextPage < 10);
      } catch (error) {
        console.error(error);
        showFailureToast(error, {
          title: "Something went wrong",
        });
      } finally {
        // alreadyCalled.current = false;
        setIsLoading(false);
      }
    },
    [],
  );

  const onLoadMore = useCallback(() => {
    console.debug("onLoadMore");
    setNextPage((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // cancelRef.current?.abort();
    // cancelRef.current = new AbortController();

    // if (alreadyCalled.current) {
    //   return;
    // }

    loadNextPage(
      nextPage,
      // cancelRef.current?.signal
    );

    // return () => {
    //   cancelRef.current?.abort();
    // };
  }, [nextPage]);

  return (
    <List isLoading={isLoading} pagination={{ onLoadMore, hasMore, pageSize: limit }}>
      {data.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          accessories={[
            {
              tag: {
                value: getDisplaySize(item.size_bytes),
                color: Color.Green,
              },
            },
            {
              tag: {
                value: getTimeDifference(item.date_released_unix),
                color: Color.Blue,
              },
              tooltip: new Date(item.date_released_unix * 1000).toLocaleTimeString(),
            },
            {
              tag: {
                value: item.seeds.toString(),
                color: Color.Magenta,
              },
              tooltip: `${item.seeds} Seeds`,
              icon: Icon.Person,
            },
          ]}
          actions={<Actions data={item} showDetails={true} />}
        />
      ))}
    </List>
  );
}
