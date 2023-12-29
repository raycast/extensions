import { Action, Clipboard, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import { addToQueue } from "../api/addTrackToQueue";
import { getErrorMessage } from "../helpers/getError";
import { showFailureToast } from "@raycast/utils";

type PlayActionProps = {
  id?: string;
  type?: "album" | "artist" | "playlist" | "track" | "show" | "episode";
  playingContext?: string;
  onPlay?: () => void;
  tracksToQueue?: SimplifiedTrackObject[];
};

export function PlayAction({ id, type, playingContext, onPlay, tracksToQueue }: PlayActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const handlePlayAction = async () => {
    try {
      await play({ id, type, contextUri: playingContext });
      if (closeWindowOnAction) {
        await showHUD("Playing");
        await popToRoot();
      } else {
        const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
        if (onPlay) onPlay();
        toast.title = "Playing";
        toast.style = Toast.Style.Success;
      }
      if (tracksToQueue) {
        for (const track of tracksToQueue) {
          await addToQueue({ uri: track.uri as string });
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (closeWindowOnAction) {
        await showHUD("Failed to play");
        await popToRoot();
      } else {
        await showFailureToast(error, {
          title: message.toLowerCase().includes("no active device") ? "No active device" : "Failed to play",
          primaryAction: {
            title: "Copy Error",
            shortcut: { modifiers: ["cmd"], key: "t" },
            onAction: async () => {
              await Clipboard.copy(message);
            },
          },
        });
      }
    }
  };

  return <Action icon={Icon.Play} title="Play" onAction={handlePlayAction} />;
}
