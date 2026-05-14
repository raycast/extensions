import { Action, Clipboard, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
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
  const { closeWindowOnAction } = getPreferenceValues<ExtensionPreferences>();

  const handlePlayAction = async () => {
    try {
      // If we have tracks to queue, pass them all as uris in a single play call
      // instead of play() + N separate addToQueue() calls
      if (tracksToQueue && tracksToQueue.length > 0) {
        const mainUri = id && type ? `spotify:${type}:${id}` : undefined;
        const uris = [...(mainUri ? [mainUri] : []), ...tracksToQueue.map((track) => track.uri as string)];
        await play({ uris });
      } else {
        await play({ id, type, contextUri: playingContext });
      }
      if (closeWindowOnAction) {
        await showHUD("Playing");
        await popToRoot();
      } else {
        const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
        if (onPlay) onPlay();
        toast.title = "Playing";
        toast.style = Toast.Style.Success;
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
            shortcut: { macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } },
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
