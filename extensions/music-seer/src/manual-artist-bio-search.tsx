import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import ArtistBioView from "./artist-bio";

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
    image_url?: string;
    url: string;
  };
};

function getArtistHits(data: QueryResponse | undefined): Hit[] {
  const directHits = data?.response?.hits || [];
  if (directHits.length > 0) {
    return directHits;
  }
  return (data?.response?.sections || []).flatMap((section) => section.hits || []);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ManualArtistBioSearch }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const { data, isLoading } = useFetch<QueryResponse>(
    `https://genius.com/api/search/artists?q=${encodeURIComponent(searchText)}`,
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
      searchBarPlaceholder="Enter artist or song..."
      throttle
    >
      {getArtistHits(data).map((item, idx) => (
        <List.Item
          key={idx}
          title={item.result.name || "Unknown Artist"}
          icon={item.result.image_url || Icon.Person}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Artist Info"
                icon={Icon.Person}
                target={
                  <ArtistBioView
                    artistId={item.result.id}
                    name={item.result.name}
                    preferredManualQuery={searchText}
                    openedFromManualSearch
                  />
                }
              />
              <Action.OpenInBrowser title="Open in Browser" url={item.result.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
