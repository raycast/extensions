import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { pause } from "../api/pause";

type PauseActionProps = {
  onPause?: () => void;
};

export function PauseAction({ onPause }: PauseActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <Action
      icon={Icon.Pause}
      title="Pause"
      onAction={async () => {
        if (closeWindowOnAction) {
          await pause();
          await showHUD("Paused");
          await popToRoot();
          return;
        }
        const toast = await showToast({ title: "Pausing...", style: Toast.Style.Animated });
        await pause();
        if (onPause) {
          await onPause();
        }
        toast.title = "Paused";
        toast.style = Toast.Style.Success;
      }}
    />
  );
}
