import { ActionPanel, Action, List, Icon, Application, open, Toast, showToast } from "@raycast/api";
import { Stream, Media, Episode } from "../types";
import { extractQualityFromTitle, extractSizeFromTitle, extractSourceFromTitle } from "../utils/streamUtils";

interface StreamListProps {
  streams: Stream[] | undefined;
  media: Media | null;
  episode?: Episode | null;
  isLoading: boolean;
  defaultStreamingApp: Application;
  streamingAppsArray: Application[];
  isEpisodeWatched?: (episodeId: string) => boolean;
  markEpisodeAsWatched?: (episode: Episode, seriesId: string) => void;
  markEpisodeAsUnwatched?: (episode: Episode) => void;
}

export function StreamList({
  streams,
  media,
  episode,
  isLoading,
  isEpisodeWatched,
  defaultStreamingApp,
  streamingAppsArray,
  markEpisodeAsWatched,
  markEpisodeAsUnwatched,
}: StreamListProps) {
  const title = media
    ? media.type === "movie"
      ? media.name
      : `${media.name} - S${episode?.season.toString().padStart(2, "0")}E${episode?.number.toString().padStart(2, "0")} - ${episode?.name}`
    : "Unknown";

  const watched = episode && isEpisodeWatched ? isEpisodeWatched(episode.id) : false;

  const openInApplication = async (stream: Stream, app: Application) => {
    console.log(
      `Opening stream! \nNAME: ${app.name},\nURL: ${stream.url}\nBundle ID: ${app.bundleId}\nPATH: ${app.path}`,
    );
    try {
      await open(stream.url, app);
    } catch (error) {
      console.error(`Failed to open stream in ${app.name}:`, error);
      if (!stream.url) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Stream URL",
          message: "You may need an API key to access streams. Check your addon configuration.",
        });
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Stream",
        message: `Could not open ${stream.url} URL in ${app.name}.`,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Streams for "${title}"`}
      searchBarPlaceholder="Filter streams..."
      isShowingDetail
      actions={
        <ActionPanel>
          {episode && media && isEpisodeWatched && markEpisodeAsWatched && markEpisodeAsUnwatched && (
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
          )}
        </ActionPanel>
      }
    >
      {!streams || streams.length === 0 ? (
        <List.EmptyView title="No Streams Available" description="There are no streams available for this media." />
      ) : (
        <List.Section title="Available Streams" subtitle={`${streams.length} streams`}>
          {streams.map((stream, index) => (
            <List.Item
              key={index}
              title={stream.title || "Unknown"}
              subtitle={extractQualityFromTitle(stream.title)}
              accessories={[{ text: extractSizeFromTitle(stream.title) }]}
              detail={
                <List.Item.Detail
                  markdown={`# ${title}\n\n${stream.title}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Quality" text={extractQualityFromTitle(stream.title)} />
                      <List.Item.Detail.Metadata.Label title="Size" text={extractSizeFromTitle(stream.title)} />
                      <List.Item.Detail.Metadata.Label title="Source" text={extractSourceFromTitle(stream.title)} />
                      <List.Item.Detail.Metadata.Label
                        title="Filename"
                        text={stream.behaviorHints?.filename || "Unknown"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Open in ${defaultStreamingApp.name}`}
                    onAction={() => openInApplication(stream, defaultStreamingApp)}
                    icon={Icon.Play}
                  />
                  {streamingAppsArray.map((app: Application) => (
                    <Action
                      key={`${app.bundleId}`}
                      title={`Open in ${app.name}`}
                      onAction={() => openInApplication(stream, app)}
                      icon={Icon.Play}
                    />
                  ))}
                  <Action.OpenInBrowser
                    url={stream.url}
                    title="Open in Browser"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Stream URL"
                    content={stream.url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {episode && media && isEpisodeWatched && markEpisodeAsWatched && markEpisodeAsUnwatched && (
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
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
