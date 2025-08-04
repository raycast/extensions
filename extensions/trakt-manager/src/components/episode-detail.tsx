import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useState } from "react";
import { IMDB_APP_URL, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getScreenshotUrl, getTraktUrl } from "../lib/helper";
import { TraktEpisodeListItem, TraktShowHistoryListItem } from "../lib/schema";

interface EpisodeDetailProps {
  episode: TraktShowHistoryListItem | TraktEpisodeListItem;
  showSlug?: string;
  onCheckIn?: (episode: TraktShowHistoryListItem | TraktEpisodeListItem) => Promise<void>;
  onAddToHistory?: (episode: TraktShowHistoryListItem | TraktEpisodeListItem) => Promise<void>;
}

export const EpisodeDetail = ({ episode, showSlug, onCheckIn, onAddToHistory }: EpisodeDetailProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(
    async (action: (episode: TraktShowHistoryListItem | TraktEpisodeListItem) => Promise<void>, message: string) => {
      if (!action) return;
      setIsLoading(true);
      try {
        await action(episode);
      } catch (error) {
        console.error(message, error);
      } finally {
        setIsLoading(false);
      }
    },
    [episode],
  );

  const isShowHistoryItem = "show" in episode;
  const episodeData = isShowHistoryItem ? episode.episode : episode;
  const showData = isShowHistoryItem ? episode.show : null;
  const slug = showSlug || showData?.ids.slug;

  const screenshotUrl = getScreenshotUrl(episodeData.images, "episode.png");
  const navigationTitle = showData
    ? `${showData.title} - ${episodeData.title}`
    : `S${episodeData.season}E${episodeData.number} - ${episodeData.title}`;

  const markdown = `
${screenshotUrl !== "episode.png" ? `<img src="${screenshotUrl}" alt="Episode Screenshot" height="200" />` : ""}

# ${episodeData.title || "Unknown Episode"}

${showData ? `**${showData.title}**` : ""} - Season ${episodeData.season || "Unknown"}, Episode ${episodeData.number || "Unknown"}

${episodeData.overview || ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Episode Title" text={episodeData.title} />
          {showData && <Detail.Metadata.Label title="Show" text={showData.title} />}
          <Detail.Metadata.Label title="Season" text={episodeData.season.toString()} />
          <Detail.Metadata.Label title="Episode" text={episodeData.number.toString()} />

          <Detail.Metadata.Separator />

          {episodeData.rating > 0 && (
            <Detail.Metadata.Label title="Rating" text={`${episodeData.rating}/10`} icon={Icon.Star} />
          )}
          {episodeData.votes > 0 && <Detail.Metadata.Label title="Votes" text={episodeData.votes.toString()} />}
          {episodeData.runtime > 0 && (
            <Detail.Metadata.Label title="Runtime" text={`${episodeData.runtime} minutes`} icon={Icon.Clock} />
          )}
          {episodeData.comment_count > 0 && (
            <Detail.Metadata.Label title="Comments" text={episodeData.comment_count.toString()} />
          )}

          <Detail.Metadata.Separator />

          {episodeData.first_aired && (
            <Detail.Metadata.Label title="First Aired" text={new Date(episodeData.first_aired).toLocaleDateString()} />
          )}
          {episodeData.updated_at && (
            <Detail.Metadata.Label title="Last Updated" text={new Date(episodeData.updated_at).toLocaleDateString()} />
          )}

          {(episodeData.ids.trakt || episodeData.ids.tvdb || episodeData.ids.imdb || episodeData.ids.tmdb) && (
            <>
              <Detail.Metadata.Separator />
              {episodeData.ids.trakt && (
                <Detail.Metadata.Label title="Trakt ID" text={episodeData.ids.trakt.toString()} />
              )}
              {episodeData.ids.tvdb && <Detail.Metadata.Label title="TVDb ID" text={episodeData.ids.tvdb.toString()} />}
              {episodeData.ids.imdb && <Detail.Metadata.Label title="IMDb ID" text={episodeData.ids.imdb} />}
              {episodeData.ids.tmdb && <Detail.Metadata.Label title="TMDb ID" text={episodeData.ids.tmdb.toString()} />}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {onCheckIn && (
              <Action
                title="Check-in"
                icon={Icon.Checkmark}
                onAction={() => handleAction(onCheckIn, "Failed to check-in episode")}
              />
            )}
            {onAddToHistory && (
              <Action
                title="Mark as Watched"
                icon={Icon.Clock}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() => handleAction(onAddToHistory, "Failed to add episode to history")}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("episode", slug!, episodeData.season, episodeData.number)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(episodeData.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
