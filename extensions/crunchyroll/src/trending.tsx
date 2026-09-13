import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimeSeries } from "./crunchyroll-api";
import { openCrunchyrollURL } from "./webapp";
import { fetchTrending, getTrendingFromCache, trendingKey } from "./query";
import { withQueryClient } from "./with-query";

function TrendingCommand() {
  const [cached, setCached] = useState<AnimeSeries[]>([]);

  useEffect(() => {
    getTrendingFromCache().then((c) => {
      if (c && c.length > 0) setCached(c);
    });
  }, []);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: trendingKey,
    queryFn: fetchTrending,
  });

  const results = data ?? cached;
  const showLoading = isLoading && cached.length === 0;
  const showRefetching = isFetching && cached.length > 0;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <List
      isLoading={showLoading || showRefetching}
      searchBarPlaceholder="Filter trending anime..."
    >
      {errorMessage && !results.length ? (
        <List.EmptyView
          title="Error"
          description={errorMessage}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: { light: "red", dark: "red" },
          }}
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withQueryClient(TrendingCommand);
