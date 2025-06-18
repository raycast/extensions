import { ActionPanel, Action, List, Icon, Application } from "@raycast/api";
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
  onConfigure: () => void;
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
  onConfigure,
}: StreamListProps) {
  const title = media
    ? media.type === "movie"
      ? media.name
      : `${media.name} - S${episode?.season.toString().padStart(2, "0")}E${episode?.number.toString().padStart(2, "0")} - ${episode?.name}`
    : "Unknown";

  const watched = episode && isEpisodeWatched ? isEpisodeWatched(episode.id) : false;

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
          <Action title="Configure" onAction={onConfigure} icon={Icon.Gear} />
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
                  <Action.Open
                    title={`Open in ${defaultStreamingApp.name}`}
                    target={stream.url}
                    application={defaultStreamingApp.path}
                    icon={Icon.Play}
                  />
                  {streamingAppsArray.map((app: Application) => (
                    <Action.Open
                      key={`${app.bundleId}`}
                      title={`Open in ${app.name}`}
                      target={stream.url}
                      application={`${app.path}`}
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
                  <Action title="Configure" onAction={onConfigure} icon={Icon.Gear} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
