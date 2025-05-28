import { ActionPanel, Action, Icon, showToast, Toast, List } from "@raycast/api";
import { moviedb } from "../api";
import { SimpleEpisode } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import TvShowEpisode from "./TvShowEpisode";

function Episodes({
  id,
  seasonNumber,
  seasonStart,
  seasonEnd,
}: {
  id: number;
  seasonNumber: number;
  seasonStart: number;
  seasonEnd: number;
}) {
  const [selectedEpisode, setSelectedEpisode] = useState<string>("all");
  const [_seasonNumber, setSeasonNumber] = useState<number>(seasonNumber);

  const fetchEpisodes = async (id: number, seasonNumber: number) => {
    const response = await moviedb.seasonInfo({ id, season_number: seasonNumber });
    return { episodes: response.episodes ?? [], seasonName: response.name ?? "Unknown Season" };
  };

  const { data: episodeInfo, isLoading: isLoadingEpisodes } = useCachedPromise(fetchEpisodes, [id, _seasonNumber], {
    onError: async (error) => {
      error.name && console.error(error.name);
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const fetchShowInfo = async (id: number) => {
    const response = await moviedb.tvInfo({ id });
    return response.name || "Unknown Show";
  };

  const { data: showInfo, isLoading: isLoadingInfo } = useCachedPromise(fetchShowInfo, [id], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const episodeData = episodeInfo?.episodes;

  const episodeStart = episodeData?.[0].episode_number || 0;
  const episodeEnd = episodeData?.[episodeData.length - 1].episode_number || 0;

  const filteredEpisodes = ((episodeData as SimpleEpisode[]) || []).filter(
    (episode) =>
      selectedEpisode === "all" ||
      selectedEpisode === episode.episode_number?.toString() ||
      episode.episode_number === 0,
  );

  return (
    <List
      isLoading={isLoadingEpisodes || isLoadingInfo}
      isShowingDetail
      searchBarPlaceholder={`Filter through ${showInfo} episodes by name`}
      navigationTitle={`${episodeInfo?.seasonName} - ${selectedEpisode === "all" ? "All" : selectedEpisode}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Episode" onChange={setSelectedEpisode} value={selectedEpisode}>
          <List.Dropdown.Section title="Episodes">
            <List.Dropdown.Item title="All" value="all" />
            {(episodeData || []).map((episode) => (
              <List.Dropdown.Item
                key={episode.id}
                title={episode.episode_number?.toString() || "Unknown Episode"}
                value={episode.episode_number?.toString() || "no-episode"}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredEpisodes.map((episode) => {
        const overview = episode.overview || "";

        let markdown = `![TV Show Banner](https://image.tmdb.org/t/p/w500${episode.still_path})\n\n${overview}`;

        if ((episode?.name?.length ?? 0) > 28) {
          markdown = `${markdown}\n\n**${episode.name}**`;
        }

        return (
          <List.Item
            title={`${episode.name || "Unknown Episode"}`}
            key={episode.id}
            accessories={[{ tag: { value: episode.episode_number?.toString() || "XX", color: "green" } }]}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Episode Details"
                  icon={Icon.Sidebar}
                  target={
                    <TvShowEpisode
                      showId={id}
                      seasonNumber={_seasonNumber}
                      _episodeNumber={episode.episode_number || 0}
                      episodeStart={episodeStart}
                      episodeEnd={episodeEnd}
                      seasonName={episodeInfo?.seasonName || "Unknown Season"}
                    />
                  }
                />
                <Action.OpenInBrowser
                  title="Open in TMDB"
                  url={`https://www.themoviedb.org/tv/${episode.show_id}/season/${episode.season_number}/episode/${episode.episode_number}`}
                />
                {episode.id ? (
                  <Action.CopyToClipboard
                    title={`Copy TMDB ID`}
                    content={episode.id.toString()}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                ) : null}
                <ActionPanel.Section>
                  <Action
                    icon={Icon.ArrowRight}
                    title="Next Page"
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => {
                      setSeasonNumber((_seasonNumber) => (_seasonNumber < seasonEnd ? _seasonNumber + 1 : seasonStart));
                    }}
                  />
                  <Action
                    icon={Icon.ArrowLeft}
                    title="Previous Page"
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={() =>
                      setSeasonNumber((_seasonNumber) => (_seasonNumber > seasonStart ? seasonNumber - 1 : seasonEnd))
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default Episodes;
