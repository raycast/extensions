import { Metadata } from "../types/types";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { calculateTime } from "../utils/timeCalculator";
import { getContentRatingColor } from "../utils/contentRating";
import { formatDistanceToNow } from "date-fns";
import { getImdbUrl, getPlexDeeplink, getThumbLink, getTmdbUrl } from "../utils/links";

export function MediaItem({ item, machineIdentifier }: { item: Metadata; machineIdentifier?: string }) {
  const title = `# ${item.title}`;
  const image = `![](${getThumbLink({ thumb: item.art, width: 900, height: 600 })})`;
  const summary = item.summary ? `${item.summary}` : "";

  const markdown = `${title} \n\n ${summary} \n\n ${image} `;

  const plexDeepLink = getPlexDeeplink(item.key, machineIdentifier);
  const imdbUrl = getImdbUrl(item.title);
  const tmdbUrl = getTmdbUrl(item.title);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.title || ""}
      metadata={
        <Detail.Metadata>
          {item.year && <Detail.Metadata.Label icon={"📅"} title="Year" text={item.year.toString()} />}

          {item.rating && <Detail.Metadata.Label icon={"⭐"} title="Critic Rating" text={item.rating.toString()} />}

          {item.audienceRating && (
            <Detail.Metadata.Label icon={"🍿"} title="Audience Rating" text={item.audienceRating.toString()} />
          )}

          {item.duration && <Detail.Metadata.Label icon={"⌛"} title="Duration" text={calculateTime(item.duration)} />}

          {item.contentRating && (
            <Detail.Metadata.TagList title="Content Rating">
              <Detail.Metadata.TagList.Item
                text={item.contentRating}
                color={getContentRatingColor(item.contentRating)}
              />
            </Detail.Metadata.TagList>
          )}

          {item.Genre && item.Genre.length > 0 && (
            <Detail.Metadata.TagList title="Genres">
              {item.Genre.map((genre) => (
                <Detail.Metadata.TagList.Item key={genre.tag} text={genre.tag} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Watch Status">
            {item.viewOffset ? (
              <Detail.Metadata.TagList.Item
                text={`In Progress (${calculateTime(item.viewOffset)})`}
                color={Color.Orange}
              />
            ) : item.viewCount ? (
              <Detail.Metadata.TagList.Item
                text={`Watched${item.viewCount > 1 ? ` ${item.viewCount}x` : ""}`}
                color={Color.Green}
              />
            ) : (
              <Detail.Metadata.TagList.Item text="Unwatched" color={Color.SecondaryText} />
            )}
          </Detail.Metadata.TagList>

          {item.lastViewedAt && (
            <Detail.Metadata.Label
              icon={"🕐"}
              title="Last Watched"
              text={formatDistanceToNow(new Date(item.lastViewedAt * 1000), { addSuffix: true })}
            />
          )}

          <Detail.Metadata.Separator />

          {item.Director && item.Director.length > 0 && (
            <Detail.Metadata.Label icon={"🎬"} title="Director" text={item.Director.map((d) => d.tag).join(", ")} />
          )}

          {item.Role && item.Role.length > 0 && (
            <Detail.Metadata.Label
              icon={"👥"}
              title="Cast"
              text={item.Role.slice(0, 3)
                .map((r) => r.tag)
                .join(", ")}
            />
          )}

          {item.Writer && item.Writer.length > 0 && (
            <Detail.Metadata.Label icon={"✏️"} title="Writer" text={item.Writer.map((w) => w.tag).join(", ")} />
          )}

          {item.studio && <Detail.Metadata.Label icon={"🎥"} title="Studio" text={item.studio} />}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link title="Open in Plex" target={plexDeepLink} text="Plex" />
          <Detail.Metadata.Link title="Search IMDB" target={imdbUrl} text="IMDB" />
          <Detail.Metadata.Link title="Search TMDB" target={tmdbUrl} text="TMDB" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Play} url={plexDeepLink} title="Open in Plex" />
          <Action.OpenInBrowser icon={Icon.MagnifyingGlass} url={imdbUrl} title="Search on IMDB" />
          <Action.OpenInBrowser icon={Icon.MagnifyingGlass} url={tmdbUrl} title="Search on TMDB" />
          <Action.CopyToClipboard icon={Icon.Clipboard} content={item.title} title="Copy Title" />
        </ActionPanel>
      }
    />
  );
}
