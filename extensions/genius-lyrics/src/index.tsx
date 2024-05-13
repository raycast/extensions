import { ActionPanel, List, Action, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import Lyrics from "./Lyrics";

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

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {(data?.response.hits || []).map((item, idx) => (
        <List.Item
          key={idx}
          icon={item.result.song_art_image_thumbnail_url}
          title={item.result.full_title}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Lyrics url={item.result.url} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
