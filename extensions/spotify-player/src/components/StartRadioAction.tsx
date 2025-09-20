import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { startRadio } from "../api/startRadio";
import { getError } from "../helpers/getError";

type StartRadioActionProps = {
  trackId?: string;
  artistId?: string;
  onRadioStarted?: () => void;
};

export function StartRadioAction({ trackId, artistId, onRadioStarted }: StartRadioActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <Action
      icon={Icon.Music}
      title="Start Radio"
      onAction={async () => {
        if (closeWindowOnAction) {
          try {
            await startRadio({
              trackIds: trackId ? [trackId] : undefined,
              artistIds: artistId ? [artistId] : undefined,
            });
            await showHUD("Playing Radio");
            await popToRoot();
            return;
          } catch (err) {
            const error = getError(err);
            await showHUD(error.message);
          }
        }

        const toast = await showToast({ title: "Starting Radio...", style: Toast.Style.Animated });
        try {
          await startRadio({
            trackIds: trackId ? [trackId] : undefined,
            artistIds: artistId ? [artistId] : undefined,
          });

          if (!onRadioStarted) {
            toast.title = "Playing radio";
            toast.style = Toast.Style.Success;
          }

          if (onRadioStarted) {
            // The Start Radio API call is not instant, so we need to wait a bit before revalidating
            setTimeout(() => {
              onRadioStarted();
              toast.title = "Playing Radio";
              toast.style = Toast.Style.Success;
            }, 300);
          }
        } catch (err) {
          const error = getError(err);
          toast.title = "Error Starting Radio";
          toast.message = error.message;
          toast.style = Toast.Style.Failure;
        }
      }}
    />
  );
}
