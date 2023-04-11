import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { play } from "../api/play";

type PlayActionProps = {
  id?: string;
  type?: "album" | "artist" | "playlist" | "track" | "show" | "episode";
  playingContext?: string;
  onPlay?: () => void;
};

export function PlayAction({ id, type, playingContext, onPlay }: PlayActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();
  console.log({ closeWindowOnAction });

  return (
    <Action
      icon={Icon.Play}
      title="Play"
      onAction={async () => {
        if (closeWindowOnAction) {
          await play({ id, type, contextUri: playingContext });
          await showHUD("Playing");
          await popToRoot();
          return;
        }
        const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
        await play({ id, type, contextUri: playingContext });
        if (onPlay) {
          await onPlay();
        }
        toast.title = "Playing";
        toast.style = Toast.Style.Success;
      }}
    />
  );
}
