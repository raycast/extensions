import { ActionPanel, List, Action, LaunchProps, Icon } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import Lyrics from "./Lyrics";
import History, { HistoryItem } from "./History";

type QueryResponse = {
  response: {
    hits: Hit[];
  };
};

type Hit = {
  result: {
    full_title: string;
    song_art_image_thumbnail_url: string;
    url: string;
  };
};

export default function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const { data, isLoading } = useFetch<QueryResponse>(
    `https://genius.com/api/search?q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
    },
  );
  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<HistoryItem[]>("history", []);

  return (
    <List
      isLoading={isLoading || isHistoryLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter title..."
      throttle
    >
      {searchText.length === 0 ? (
        <History />
      ) : (
        <>
          {(data?.response.hits || []).map((item, idx) => (
            <List.Item
              key={idx}
              title={item.result.full_title}
              icon={item.result.song_art_image_thumbnail_url}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Lyrics"
                    icon={Icon.Paragraph}
                    target={<Lyrics url={item.result.url} title={item.result.full_title} />}
                    onPush={() => {
                      const existingIdx = history!.findIndex(
                        (i) => i.title.toLowerCase() === item.result.full_title.toLowerCase(),
                      );
                      if (existingIdx !== -1) {
                        history![existingIdx] = {
                          ...history![existingIdx],
                          viewedAt: Date.now(),
                        };
                        setHistory(history!);
                      } else {
                        setHistory(
                          history?.concat({
                            title: item.result.full_title,
                            thumbnail: item.result.song_art_image_thumbnail_url,
                            url: item.result.url,
                            viewedAt: Date.now(),
                          }) || [],
                        );
                      }
                    }}
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={item.result.url} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
