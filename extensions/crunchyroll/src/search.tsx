import {
  List,
  ActionPanel,
  Action,
  Icon,
  LaunchProps,
  Image,
} from "@raycast/api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchAnime } from "./crunchyroll-api";
import { openCrunchyrollURL } from "./webapp";
import { withQueryClient } from "./with-query";

interface SearchArguments {
  query?: string;
}

function SearchCommand(props: LaunchProps<{ arguments: SearchArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crunchyroll", "search", searchText.trim()],
    queryFn: () => searchAnime(searchText.trim()),
    enabled: searchText.trim().length > 0,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search anime on Crunchyroll..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {errorMessage && !isLoading ? (
        <List.EmptyView
          title="Search Error"
          description={errorMessage.slice(0, 500)}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: { light: "red", dark: "red" },
          }}
        />
      ) : results.length === 0 && !isLoading && searchText.trim() ? (
        <List.EmptyView
          title="No results found"
          description={`No anime found for "${searchText}"`}
        />
      ) : (
        results.map((anime) => (
          <List.Item
            key={anime.id}
            title={anime.title}
            subtitle={anime.year ? String(anime.year) : undefined}
            accessories={[
              anime.isPremium ? { text: "Premium", icon: Icon.Crown } : {},
              anime.episodes ? { text: `${anime.episodes} eps` } : {},
            ].filter((a) => Object.keys(a).length > 0)}
            icon={
              anime.image
                ? { source: anime.image, mask: Image.Mask.RoundedRectangle }
                : Icon.Video
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open in Crunchyroll"
                  icon={Icon.Play}
                  onAction={() => openCrunchyrollURL(anime.url)}
                />
                <Action.OpenInBrowser title="Open in Browser" url={anime.url} />
                <Action.CopyToClipboard title="Copy URL" content={anime.url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withQueryClient(SearchCommand);
