import { Action, ActionPanel, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { ReactNode } from "react";

import {
  Anime,
  formatAiringTime,
  formatAnimeDate,
  getAnimeTitle,
  getCrunchyrollLink,
  getEpisodeProgress,
  getStreamingLinks,
  getTrailerUrl,
} from "./anilist";
import { AnimePreferences } from "./preferences";
import { removeAnime, saveAnime } from "./watchlist-storage";

type AnimeActionsProps = {
  anime: Anime;
  preferences: AnimePreferences;
  onWatchlistChange?: () => void;
  extraActions?: ReactNode;
  showDetailAction?: boolean;
  showRemoveFromWatchlist?: boolean;
};

export function AnimeActions({
  anime,
  preferences,
  onWatchlistChange,
  extraActions,
  showDetailAction = true,
  showRemoveFromWatchlist = false,
}: AnimeActionsProps) {
  const crunchyrollUrl = getCrunchyrollLink(anime);
  const streamingLinks = getStreamingLinks(anime);
  const trailerUrl = getTrailerUrl(anime);
  const shouldPreferCrunchyroll = preferences.prefersCrunchyroll && Boolean(crunchyrollUrl);
  const primaryUrl = shouldPreferCrunchyroll ? crunchyrollUrl : anime.siteUrl;
  const primaryTitle = shouldPreferCrunchyroll ? "Open In Crunchyroll" : "Open In AniList";

  return (
    <ActionPanel>
      {showDetailAction ? (
        <Action.Push
          title="View Details"
          icon={Icon.Sidebar}
          target={<AnimeDetail anime={anime} preferences={preferences} />}
        />
      ) : null}
      {primaryUrl ? <OpenUrlAction key={`primary-${primaryUrl}`} title={primaryTitle} url={primaryUrl} /> : null}
      {anime.siteUrl && primaryUrl !== anime.siteUrl ? (
        <OpenUrlAction key={`anilist-${anime.siteUrl}`} title="Open In AniList" url={anime.siteUrl} />
      ) : null}
      {streamingLinks
        .filter((link) => link.url !== primaryUrl)
        .map((link) => (
          <OpenUrlAction
            key={`streaming-${link.site}-${link.url}`}
            title={buildOpenActionTitle(link.site)}
            url={link.url}
            icon={link.icon}
          />
        ))}
      {trailerUrl ? (
        <OpenUrlAction key={`trailer-${trailerUrl}`} title="Open Trailer" url={trailerUrl} icon={Icon.Play} />
      ) : null}
      {showRemoveFromWatchlist ? (
        <Action
          title="Remove from Watchlist"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            await removeAnime(anime.id);
            await showToast(Toast.Style.Success, "Removed from watchlist");
            onWatchlistChange?.();
          }}
        />
      ) : (
        <Action
          title="Save to Watchlist"
          icon={Icon.Plus}
          onAction={async () => {
            await saveAnime(anime);
            await showToast(Toast.Style.Success, "Saved to watchlist");
            onWatchlistChange?.();
          }}
        />
      )}
      {extraActions}
    </ActionPanel>
  );
}

function OpenUrlAction({ icon, title, url }: { icon?: string; title: string; url: string }) {
  return <Action title={title} icon={icon} onAction={() => open(url)} />;
}

function buildOpenActionTitle(site: string) {
  return `Open In ${site}`;
}

function AnimeDetail({ anime, preferences }: { anime: Anime; preferences: AnimePreferences }) {
  const title = getAnimeTitle(anime);
  const trailerUrl = getTrailerUrl(anime);
  const nextEpisode = anime.nextAiringEpisode
    ? `Episode ${anime.nextAiringEpisode.episode} - ${formatAiringTime(anime.nextAiringEpisode.airingAt)}`
    : "Unknown";

  const externalLinks =
    anime.externalLinks
      ?.filter((link) => link.url)
      .map((link) => `- [${link.site}](${link.url})`)
      .join("\n") || "No external links available.";

  const markdown = [
    anime.coverImage?.extraLarge || anime.coverImage?.large
      ? `![${title}](${anime.coverImage.extraLarge || anime.coverImage.large})`
      : "",
    `# ${title}`,
    trailerUrl && anime.trailer?.thumbnail ? `[![Trailer](${anime.trailer.thumbnail})](${trailerUrl})` : "",
    anime.description || "No description available.",
    anime.genres?.length ? `**Genres:** ${anime.genres.join(", ")}` : "",
    "## External Links",
    externalLinks,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={anime.status?.replaceAll("_", " ") ?? "Unknown"} />
          <Detail.Metadata.Label title="Format" text={anime.format?.replaceAll("_", " ") ?? "Unknown"} />
          <Detail.Metadata.Label title="Premiere" text={formatAnimeDate(anime.startDate)} />
          <Detail.Metadata.Label title="Episodes" text={getEpisodeProgress(anime)} />
          <Detail.Metadata.Label title="Next Episode" text={nextEpisode} />
          {anime.averageScore ? <Detail.Metadata.Label title="Score" text={`${anime.averageScore}%`} /> : null}
          {trailerUrl ? (
            <Detail.Metadata.Link title="Trailer" text={anime.trailer?.site ?? "Trailer"} target={trailerUrl} />
          ) : null}
          {anime.studios?.nodes.length ? (
            <Detail.Metadata.Label title="Studio" text={anime.studios.nodes.map((studio) => studio.name).join(", ")} />
          ) : null}
        </Detail.Metadata>
      }
      actions={<AnimeActions anime={anime} preferences={preferences} showDetailAction={false} />}
    />
  );
}
