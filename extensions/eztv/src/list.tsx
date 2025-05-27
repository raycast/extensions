import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import Actions from "./actions";
import { Ressult, Series } from "./types";
import { getDisplaySize, getTimeDifference } from "./util";

const limit = 100;

export default function ListView() {
  // const cancelRef = useRef<AbortController | null>(null);
  // const alreadyCalled = useRef(false);

  const [data, setData] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);

  // const [list, setList] = useState<Series[]>([]);

  // useEffect(() => {
  //   const getLatest = async () => {
  //     setIsLoading(true);

  //     try {
  //       console.log(`https://eztv.tf/api/get-torrents?limit=${limit}&page=1`);
  //       const res = await fetch(`https://eztv.tf/api/get-torrents?limit=${limit}&page=1`);
  //       const data = (await res.json()) as Ressult;
  //       setList(data.torrents);
  //     } catch (error) {
  //       console.log(error);
  //       setList([]);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   getLatest();
  // }, []);

  const loadNextPage = useCallback(
    async (
      nextPage: number,
      // signal?: AbortSignal
    ) => {
      // alreadyCalled.current = true;

      console.debug(`https://eztv.tf/api/get-torrents?limit=${limit}&page=${nextPage}`);

      setIsLoading(true);

      try {
        const res = await fetch(
          `https://eztv.tf/api/get-torrents?limit=${limit}&page=${nextPage}`,
          // {
          //   signal,
          // }
        );
        const newData = (await res.json()) as Ressult;

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
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          // message: error.message,
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
    <List
      isLoading={isLoading}
      //
      pagination={{ onLoadMore, hasMore, pageSize: limit }}
    >
      {data.map((item, index) => (
        <List.Item
          key={index}
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
