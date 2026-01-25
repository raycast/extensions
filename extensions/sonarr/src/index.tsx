import { Action, ActionPanel, Icon, List, confirmAlert, Alert, Color, Image, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";
import type { SingleSeries } from "@/lib/types/episode";
import { useCalendar, searchEpisode, searchSeason, toggleEpisodeMonitoring } from "@/lib/hooks/useSonarrAPI";
import {
  formatAirDate,
  formatEpisodeNumber,
  formatOverview,
  getSeriesPoster,
  getRatingDisplay,
  getEpisodeStatus,
  formatFileSize,
  formatQualityProfile,
  getSonarrUrl,
} from "@/lib/utils/formatting";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const futureDays = parseInt(preferences.futureDays || "14");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, mutate } = useCalendar(futureDays);

  const filteredEpisodes = useMemo(() => {
    if (!data) return [];

    if (!searchText) return data;

    return data.filter(
      (episode) =>
        episode.title.toLowerCase().includes(searchText.toLowerCase()) ||
        episode.series.title.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [data, searchText]);

  return (
    <List
      searchBarPlaceholder="Search upcoming episodes..."
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Upcoming Episodes" subtitle={`${filteredEpisodes.length} episodes`}>
        {filteredEpisodes.map((episode) => (
          <EpisodeListItem key={episode.id} episode={episode} onRefresh={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

function EpisodeListItem({ episode, onRefresh }: { episode: SingleSeries; onRefresh: () => void }) {
  const sonarrUrl = getSonarrUrl();

  const status = getEpisodeStatus(episode.airDateUtc, episode.hasFile, episode.monitored);
  const poster = getSeriesPoster(episode.series.images);

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    sections.push(`# ${episode.series.title}`);
    sections.push(`## ${formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}: ${episode.title}`);
    sections.push("");

    sections.push(`**Air Date:** ${formatAirDate(episode.airDateUtc)}`);
    sections.push(`**Status:** ${status.icon} ${status.label}`);
    sections.push(`**Monitored:** ${episode.monitored ? "Yes" : "No"}`);

    if (episode.series.network) {
      sections.push(`**Network:** ${episode.series.network}`);
    }

    if (episode.series.ratings) {
      sections.push(`**Series Rating:** ${getRatingDisplay(episode.series.ratings)}`);
    }

    sections.push("");

    if (episode.hasFile && episode.episodeFile) {
      sections.push("### Episode File");
      sections.push(`**Quality:** ${formatQualityProfile(episode.episodeFile.quality.quality)}`);
      sections.push(`**Size:** ${formatFileSize(episode.episodeFile.size)}`);
      if (episode.episodeFile.mediaInfo) {
        sections.push(
          `**Codec:** ${episode.episodeFile.mediaInfo.videoCodec} / ${episode.episodeFile.mediaInfo.audioCodec}`,
        );
      }
      sections.push("");
    }

    if (episode.overview) {
      sections.push("### Overview");
      sections.push(formatOverview(episode.overview));
      sections.push("");
    }

    if (episode.series.overview) {
      sections.push("### Series Overview");
      sections.push(formatOverview(episode.series.overview, 300));
    }

    return sections.join("\n");
  }, [episode, poster, status]);

  const handleSearchEpisode = async () => {
    try {
      await searchEpisode([episode.id]);
      onRefresh();
    } catch (error) {
      console.error("Failed to search episode:", error);
    }
  };

  const handleSearchSeason = async () => {
    try {
      await searchSeason(episode.seriesId, episode.seasonNumber);
      onRefresh();
    } catch (error) {
      console.error("Failed to search season:", error);
    }
  };

  const handleToggleMonitoring = async () => {
    const confirmed = await confirmAlert({
      title: episode.monitored ? "Disable Monitoring?" : "Enable Monitoring?",
      message: `Do you want to ${episode.monitored ? "stop monitoring" : "start monitoring"} this episode?`,
      primaryAction: {
        title: episode.monitored ? "Disable" : "Enable",
        style: episode.monitored ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await toggleEpisodeMonitoring(episode.id, !episode.monitored);
        onRefresh();
      } catch (error) {
        console.error("Failed to toggle monitoring:", error);
      }
    }
  };

  return (
    <List.Item
      title={episode.title}
      subtitle={`${episode.series.title} • ${formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}`}
      icon={{ source: poster || Icon.Video, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: formatAirDate(episode.airDateUtc) },
        {
          icon: episode.monitored ? Icon.Eye : Icon.EyeSlash,
          tooltip: episode.monitored ? "Monitored" : "Not Monitored",
        },
        {
          tag: {
            value: status.label,
            color: episode.hasFile ? Color.Green : episode.monitored ? Color.Red : Color.SecondaryText,
          },
        },
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Episode Actions">
            {!episode.hasFile && episode.monitored && (
              <Action
                title="Search Episode"
                icon={Icon.MagnifyingGlass}
                onAction={handleSearchEpisode}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
            <Action
              title="Search Season"
              icon={Icon.Folder}
              onAction={handleSearchSeason}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action
              title={episode.monitored ? "Disable Monitoring" : "Enable Monitoring"}
              icon={episode.monitored ? Icon.EyeSlash : Icon.Eye}
              onAction={handleToggleMonitoring}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Series in Sonarr"
              url={`${sonarrUrl}/series/${episode.series.titleSlug}`}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            {episode.series.tvdbId && (
              <Action.OpenInBrowser
                title="Open in Thetvdb"
                url={`https://thetvdb.com/?tab=series&id=${episode.series.tvdbId}`}
                icon={Icon.Link}
              />
            )}
            {episode.series.imdbId && (
              <Action.OpenInBrowser
                title="Open in Imdb"
                url={`https://www.imdb.com/title/${episode.series.imdbId}`}
                icon={Icon.Link}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Utility">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
