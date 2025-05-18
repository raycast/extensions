import { Image, AI, ActionPanel, Action, Icon, environment } from "@raycast/api";
import { Episode, MediaDetails } from "../types";
import { EpisodeList } from "./EpisodeList";
import AIReviewView from "./AIOverview";
import { getRottenTomatoesUrl, getMetacriticUrl, getIMDBUrl } from "../utils";

import MediaOverview from "./MediaOverview";

export default function MediaActions({
  media,
  episode,
  component,
}: {
  media: MediaDetails;
  episode?: Episode;
  component?: string;
}) {
  const Actions = [];

  if (media.Type === "series" && media.totalSeasons !== undefined && component !== "EpisodeOverview") {
    Actions.push(
      <Action.Push
        key="episodeList"
        title="View Episodes"
        target={<EpisodeList media={media} totalSeasons={Number(media.totalSeasons)} />}
        icon={Icon.List}
      />,
    );
  }

  Actions.push(
    <Action.Push
      key="media-review"
      title={`${media.Type.charAt(0).toUpperCase() + media.Type.slice(1)} Overview`}
      target={<MediaOverview media={media} />}
      icon={Icon.Monitor}
    />,
  );

  Actions.push(
    <Action.OpenInBrowser key="imdb" title="View on Imdb" url={getIMDBUrl(media)} icon={{ source: "imdb.png" }} />,
    <Action.OpenInBrowser
      key="youtube"
      title="Open Youtube Trailer"
      url={`https://www.youtube.com/results?search_query=${encodeURIComponent(media?.Title + "trailer")}`}
      shortcut={{ modifiers: ["cmd"], key: "y" }}
      icon={{ source: "youtube.png" }}
    />,
    <Action.OpenInBrowser
      key="rotten-tomatoes"
      title="Open on Rotten Tomatoes"
      url={getRottenTomatoesUrl(media)}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      icon={{ source: "🍅" }}
    />,
    <Action.OpenInBrowser
      key="metacritic"
      title="Open on Metacritic"
      url={getMetacriticUrl(media)}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      icon={{ source: "metacritic.png", mask: Image.Mask.Circle }}
    />,
    <Action.OpenInBrowser
      key="google"
      title={`Search on Google`}
      url={`https://www.google.com/search?q=${encodeURIComponent(media?.Title)}${episode ? `+episode+${episode.Episode.toString()}` : ""}`}
      icon={{ source: "google.png", mask: Image.Mask.Circle }}
    />,
    <Action.OpenInBrowser
      key="reddit"
      title={`Search on Reddit`}
      url={`https://www.reddit.com/search/?q=${encodeURIComponent(media?.Title)}${episode ? `+episode+${episode.Episode.toString()}` : ""}`}
      icon={{ source: "reddit.png", mask: Image.Mask.Circle }}
    />,
    <Action.OpenInBrowser
      key="cast"
      title="Open Cast on Imdb"
      url={`https://www.imdb.com/title/${media?.imdbID}/fullcredits`}
      icon={{ source: Icon.Person }}
    />,
  );

  if (environment.canAccess(AI)) {
    Actions.push(
      <Action.Push
        key="ai-review"
        title="AI Overview"
        target={<AIReviewView media={media} />}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        icon={Icon.Stars}
      />,
    );
  }

  return <ActionPanel.Section>{Actions}</ActionPanel.Section>;
}
