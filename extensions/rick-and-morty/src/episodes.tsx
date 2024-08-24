import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Episode, getEpisodes } from "rickmortyapi";
import "cross-fetch/polyfill";
import { useState } from "react";

export default function Episodes() {
  const [searchName, setSearchName] = useState("");

  const {
    isLoading,
    data: episodes,
    pagination,
  } = useCachedPromise(
    (name: string) => async (options) => {
      const response = await getEpisodes({ page: options.page, name });
      if (response.status !== 200) throw new Error(response.statusMessage);
      const data = response.data.results as Episode[];
      const hasMore = Boolean(response.data.info?.next);
      return { data, hasMore };
    },
    [searchName],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarPlaceholder="Search episode name"
      onSearchTextChange={setSearchName}
    >
      {episodes?.map((episode, episodeIndex) => (
        <List.Item
          key={episodeIndex}
          icon={Icon.FilmStrip}
          title={episode.name}
          subtitle={episode.episode}
          accessories={[{ text: `aired: ${episode.air_date}` }, { text: `${episode.characters.length} characters` }]}
        />
      ))}
    </List>
  );
}
