import { Action, Grid, Icon, List } from "@raycast/api";

import {
  Anime,
  formatAnimeDate,
  getAnimeTitle,
  getEpisodeProgress,
  getStreamingLinks,
  hasCrunchyrollLink,
} from "./anilist";
import { AnimeActions } from "./anime-actions";
import { AnimePreferences, Onboarding } from "./preferences";

type AnimeItemProps = {
  anime: Anime;
  preferences: AnimePreferences;
  onPreferencesChange: () => void;
  onWatchlistChange?: () => void;
  showRemoveFromWatchlist?: boolean;
  subtitle?: string;
};

export function AnimeListItem(props: AnimeItemProps) {
  const { anime, subtitle } = props;

  return (
    <List.Item
      key={anime.id}
      title={getAnimeTitle(anime)}
      subtitle={subtitle ?? buildSubtitle(anime)}
      icon={anime.coverImage?.large}
      accessories={buildAccessories(anime)}
      actions={<AnimeActionsWithGlobalActions {...props} />}
    />
  );
}

export function AnimeGridItem(props: AnimeItemProps) {
  const { anime, subtitle } = props;

  return (
    <Grid.Item
      key={anime.id}
      content={anime.coverImage?.extraLarge ?? anime.coverImage?.large ?? Icon.Image}
      title={getAnimeTitle(anime)}
      subtitle={subtitle ?? getEpisodeProgress(anime)}
      accessory={buildGridAccessory(anime)}
      actions={<AnimeActionsWithGlobalActions {...props} />}
    />
  );
}

function AnimeActionsWithGlobalActions({
  anime,
  preferences,
  onPreferencesChange,
  onWatchlistChange,
  showRemoveFromWatchlist,
}: AnimeItemProps) {
  return (
    <AnimeActions
      anime={anime}
      preferences={preferences}
      onWatchlistChange={onWatchlistChange}
      showRemoveFromWatchlist={showRemoveFromWatchlist}
      extraActions={
        <>
          <Action.Push
            title="Change Preferences"
            icon={Icon.Gear}
            target={<Onboarding defaultPreferences={preferences} onComplete={onPreferencesChange} isEditing />}
          />
          <Action.OpenInBrowser
            title="Send Feedback"
            icon={Icon.Envelope}
            url="mailto:esteban@damascuss.io?subject=AniMe%20Feedback"
          />
        </>
      }
    />
  );
}

export function buildAccessories(anime: Anime) {
  const streamingLinks = getStreamingLinks(anime);

  return [
    hasCrunchyrollLink(anime)
      ? {
          icon: streamingLinks.find((link) => link.site.toLowerCase().includes("crunchyroll"))?.icon,
          text: "Crunchyroll",
        }
      : undefined,
    anime.averageScore ? { text: `${anime.averageScore}%` } : undefined,
    { text: getEpisodeProgress(anime) },
    anime.status ? { text: formatStatus(anime.status) } : undefined,
  ].filter(Boolean) as List.Item.Accessory[];
}

function buildGridAccessory(anime: Anime): Grid.Item.Accessory {
  const crunchyrollIcon = getStreamingLinks(anime).find((link) =>
    link.site.toLowerCase().includes("crunchyroll"),
  )?.icon;
  if (crunchyrollIcon) return { icon: crunchyrollIcon, tooltip: "Crunchyroll" };
  return { icon: Icon.Tag, tooltip: anime.format ? formatStatus(anime.format) : "Anime" };
}

export function buildSubtitle(anime: Anime) {
  const parts = [
    anime.format ? formatStatus(anime.format) : undefined,
    `Premiere: ${formatAnimeDate(anime.startDate)}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
