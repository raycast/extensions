import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import { addToQueue } from "../api/addTrackToQueue";

type PlayActionProps = {
  id?: string;
  type?: "album" | "artist" | "playlist" | "track" | "show" | "episode";
  playingContext?: string;
  onPlay?: () => void;
  tracksToQueue?: SimplifiedTrackObject[];
};

export function PlayAction({ id, type, playingContext, onPlay, tracksToQueue }: PlayActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <Action
      icon={Icon.Play}
      title="Play"
      onAction={async () => {
        if (closeWindowOnAction) {
          await play({ id, type, contextUri: playingContext });
          await showHUD("Playing");
          await popToRoot();
          if (tracksToQueue) {
            for (const track of tracksToQueue) {
              await addToQueue({ uri: track.uri as string });
            }
          }
          return;
        }
        const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
        await play({ id, type, contextUri: playingContext });
        if (onPlay) {
          await onPlay();
        }
        toast.title = "Playing";
        toast.style = Toast.Style.Success;
        if (tracksToQueue) {
          for (const track of tracksToQueue) {
            await addToQueue({ uri: track.uri as string });
          }
        }
      }}
    />
  );
}
