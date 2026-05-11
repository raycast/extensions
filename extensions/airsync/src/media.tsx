import { Action, ActionPanel, Detail, Icon, Color, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMedia, mediaControl } from "./utils/applescript";
import React from "react";

export default function Command() {
  const { data: media, isLoading, error, revalidate } = usePromise(getMedia);

  const handleMediaControl = async (action: "toggle" | "next" | "previous" | "like") => {
    try {
      const response = await mediaControl(action);

      // Check if response is a JSON object or error string
      if (typeof response === "string") {
        // It's an error message
        await showToast({
          style: Toast.Style.Failure,
          title: "Media Control Failed",
          message: response,
        });
      } else if (response.status === "success") {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: response.message,
        });
        // Wait a bit for AirSync to update its state before refetching
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await revalidate();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: response.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Media Control Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!media) {
    return (
      <Detail
        markdown="# 🎵 No Media Playing\n\nNo media information available."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  const isPlaying = media.is_playing === "true";
  const isMuted = media.is_muted === "true";
  const hasTitle = media.title && media.title.trim() !== "";

  const title = hasTitle ? media.title : "No title";
  const artist = media.artist && media.artist.trim() !== "" ? media.artist : "Unknown artist";

  // Volume level
  const volumeLevel = parseInt(media.volume) || 0;

  // Album art
  const hasAlbumArt = media.album_art_base64 && media.album_art_base64.trim() !== "";

  // Build the player UI with album art in markdown
  const markdown = hasAlbumArt
    ? `<img src="data:image/jpeg;base64,${media.album_art_base64}" alt="Album Art" width="300" />`
    : undefined;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={title} icon={{ source: Icon.Music, tintColor: Color.Purple }} />
          <Detail.Metadata.Label title="Artist" text={artist} icon={{ source: Icon.Person, tintColor: Color.Blue }} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Status"
            text={isPlaying ? "Playing" : "Paused"}
            icon={{
              source: isPlaying ? Icon.Play : Icon.Pause,
              tintColor: isPlaying ? Color.Green : Color.Orange,
            }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Volume"
            text={`${volumeLevel}%`}
            icon={{
              source: isMuted ? Icon.SpeakerOff : Icon.SpeakerOn,
              tintColor: isMuted ? Color.Red : Color.Green,
            }}
          />
          <Detail.Metadata.TagList title="Like">
            <Detail.Metadata.TagList.Item
              text={
                media.like_status === "liked" ? "Liked" : media.like_status === "disliked" ? "Disliked" : "Not rated"
              }
              color={
                media.like_status === "liked"
                  ? Color.Red
                  : media.like_status === "disliked"
                    ? Color.Blue
                    : Color.SecondaryText
              }
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback Controls">
            <Action
              title={isPlaying ? "Pause" : "Play"}
              onAction={() => handleMediaControl("toggle")}
              icon={isPlaying ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action
              title="Next Track"
              onAction={() => handleMediaControl("next")}
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
            <Action
              title="Previous Track"
              onAction={() => handleMediaControl("previous")}
              icon={Icon.Rewind}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
            <Action
              title={media.like_status === "liked" ? "Unlike" : "Like Track"}
              onAction={() => handleMediaControl("like")}
              icon={Icon.Heart}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              onAction={revalidate}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {hasTitle && (
              <Action.CopyToClipboard
                title="Copy Track Info"
                content={`${title} - ${artist}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
