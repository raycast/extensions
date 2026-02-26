import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import AlbumBioView from "./album-bio";

type QueryResponse = {
  response?: {
    hits?: Hit[];
    sections?: Array<{
      hits?: Hit[];
    }>;
  };
};

type Hit = {
  result: {
    id?: number;
    name?: string;
    cover_art_url?: string;
    header_image_thumbnail_url?: string;
    url: string;
    artist?: {
      name?: string;
    };
  };
};

function getAlbumHits(data: QueryResponse | undefined): Hit[] {
  const directHits = data?.response?.hits || [];
  if (directHits.length > 0) {
    return directHits;
  }
  return (data?.response?.sections || []).flatMap((section) => section.hits || []);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ManualAlbumBioSearch }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const { data, isLoading } = useFetch<QueryResponse>(
    `https://genius.com/api/search/albums?q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      execute: searchText.length > 0,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter album, artist, or song..."
      throttle
    >
      {getAlbumHits(data).map((item, idx) => (
        <List.Item
          key={idx}
          title={item.result.name || "Unknown Album"}
          subtitle={item.result.artist?.name || ""}
          icon={item.result.cover_art_url || item.result.header_image_thumbnail_url || Icon.AppWindowSidebarLeft}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Album Info"
                icon={Icon.AppWindowSidebarLeft}
                target={<AlbumBioView albumId={item.result.id} title={item.result.name} openedFromManualSearch />}
              />
              <Action.OpenInBrowser title="Open in Browser" url={item.result.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
