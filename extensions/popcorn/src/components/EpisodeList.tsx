import { ActionPanel, Action, List } from "@raycast/api";
import { Media, Episode } from "../types";
import { Icon } from "@raycast/api";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface EpisodeListProps {
  media: Media;
  episodes: Episode[];
  selectedSeason: string;
  showWatchedFilter: "all" | "watched" | "unwatched";
  isLoading: boolean;
  onEpisodeSelect: (episode: Episode) => void;
  onSeasonChange: (season: string) => void;
  onWatchedFilterChange: (filter: "all" | "watched" | "unwatched") => void;
}

export function EpisodeList({
  media,
  episodes,
  selectedSeason,
  showWatchedFilter,
  isLoading,
  onEpisodeSelect,
  onSeasonChange,
  onWatchedFilterChange,
}: EpisodeListProps) {
  // Group episodes by season
  const episodesBySeason = episodes.reduce(
    (acc, episode) => {
      const season = episode.season;
      if (!acc[season]) acc[season] = [];
      acc[season].push(episode);
      return acc;
    },
    {} as Record<number, Episode[]>,
  );

  const {
    isEpisodeWatched,
    markEpisodeAsWatched,
    markSeasonAsWatched,
    markEpisodeAsUnwatched,
    getWatchedCount,
    watchedEpisodes,
  } = useLocalStorage();

  // Get seasons for dropdown
  const seasons = Object.keys(episodesBySeason).sort((a, b) => Number(a) - Number(b));

  // Filter seasons if a specific one is selected
  const seasonsToShow = selectedSeason === "all" ? seasons : [selectedSeason];

  // Find the index of the currently selected season (as string)
  const currentSeasonIndex = selectedSeason === "all" ? -1 : seasons.findIndex((s) => s === selectedSeason);

  // Determine next/previous season keys
  const prevSeason = currentSeasonIndex > 0 ? seasons[currentSeasonIndex - 1] : undefined;
  const nextSeason =
    currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1 ? seasons[currentSeasonIndex + 1] : undefined;

  // Filter episodes based on watched status
  const filterEpisodes = (episodes: Episode[]): Episode[] => {
    if (showWatchedFilter === "all") return episodes;
    if (showWatchedFilter === "watched") return episodes.filter((ep) => isEpisodeWatched(ep.id));
    if (showWatchedFilter === "unwatched") return episodes.filter((ep) => !isEpisodeWatched(ep.id));
    return episodes;
  };

  const getFilterToggleTitle = () => {
    if (showWatchedFilter === "all") return "Show Unwatched Only";
    if (showWatchedFilter === "unwatched") return "Show Watched Only";
    return "Show All Episodes";
  };

  const getFilterIcon = () => {
    if (showWatchedFilter === "all") return Icon.EyeDisabled;
    if (showWatchedFilter === "unwatched") return Icon.Eye;
    return Icon.CheckList;
  };

  const handleFilterToggle = () => {
    if (showWatchedFilter === "all") onWatchedFilterChange("unwatched");
    else if (showWatchedFilter === "unwatched") onWatchedFilterChange("watched");
    else onWatchedFilterChange("all");
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Episodes for "${media.name}"`}
      searchBarPlaceholder="Filter episodes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Season" value={selectedSeason} onChange={onSeasonChange}>
          <List.Dropdown.Item title="All Seasons" value="all" />
          {seasons.map((season) => (
            <List.Dropdown.Item
              key={season}
              title={`Season ${season} (${getWatchedCount(media.id, Number(season))}/${episodesBySeason[Number(season)].length} watched)`}
              value={season}
            />
          ))}
        </List.Dropdown>
      }
      isShowingDetail
    >
      {seasonsToShow.map((season) => {
        const seasonEpisodes = filterEpisodes(episodesBySeason[Number(season)]);
        const watchedInSeason = getWatchedCount(media.id, Number(season));
        const totalInSeason = episodesBySeason[Number(season)].length;

        return (
          <List.Section
            key={season}
            title={`Season ${season}`}
            subtitle={`${seasonEpisodes.length} episodes shown • ${watchedInSeason}/${totalInSeason} watched`}
          >
            {seasonEpisodes
              .sort((a, b) => a.number - b.number)
              .map((episode) => {
                const watched = isEpisodeWatched(episode.id);
                const watchedEpisode = watchedEpisodes.find((w) => w.episodeId === episode.id);

                return (
                  <List.Item
                    key={episode.id}
                    title={`${episode.season}x${episode.number.toString().padStart(2, "0")} - ${episode.name}`}
                    // subtitle={episode.releaseInfo}
                    accessories={[
                      { text: episode.releaseInfo },
                      ...(watched ? [{ icon: "✅", tooltip: "Watched" }] : []),
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={
                          episode.thumbnail
                            ? `![Episode](${episode.thumbnail})\n\n# ${episode.name}\n\n${episode.description || ""}`
                            : `# ${episode.name}\n\n${episode.description || ""}`
                        }
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Title" text={episode.name} />
                            <List.Item.Detail.Metadata.Label title="Season" text={episode.season.toString()} />
                            <List.Item.Detail.Metadata.Label title="Episode" text={episode.number.toString()} />
                            <List.Item.Detail.Metadata.Label title="Air Date" text={episode.releaseInfo} />
                            <List.Item.Detail.Metadata.Label
                              title="Status"
                              text={watched ? "Watched ✅" : "Not watched"}
                            />
                            {watched && watchedEpisode && (
                              <List.Item.Detail.Metadata.Label
                                title="Watched on"
                                text={new Date(watchedEpisode.watchedAt).toLocaleDateString()}
                              />
                            )}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action title="Show Streams" onAction={() => onEpisodeSelect(episode)} icon={Icon.Link} />
                        <Action
                          title={watched ? "Mark as Unwatched" : "Mark as Watched"}
                          onAction={() => {
                            if (watched) {
                              markEpisodeAsUnwatched(episode);
                            } else {
                              markEpisodeAsWatched(episode, media.id);
                            }
                          }}
                          icon={watched ? Icon.EyeDisabled : Icon.Eye}
                        />
                        <Action
                          title="Mark Season as Watched"
                          onAction={() => {
                            markSeasonAsWatched(episode.season, episodesBySeason[episode.season], media.id);
                            if (nextSeason) onSeasonChange(nextSeason);
                          }}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                          icon={Icon.Checkmark}
                        />
                        {selectedSeason !== "all" && (
                          <>
                            {prevSeason && (
                              <Action
                                title="Previous Season"
                                onAction={() => onSeasonChange(prevSeason)}
                                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                                icon={Icon.Rewind}
                              />
                            )}
                            {nextSeason && (
                              <Action
                                title="Next Season"
                                onAction={() => onSeasonChange(nextSeason)}
                                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                                icon={Icon.Forward}
                              />
                            )}
                          </>
                        )}
                        <Action
                          title={getFilterToggleTitle()}
                          onAction={handleFilterToggle}
                          icon={getFilterIcon()}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        );
      })}
    </List>
  );
}
