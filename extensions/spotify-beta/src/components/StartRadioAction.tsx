import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { startRadio } from "../api/startRadio";

type StartRadioActionProps = {
  trackId?: string;
  artistId?: string;
  revalidate?: () => void;
};

export function StartRadioAction({ trackId, artistId, revalidate }: StartRadioActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <Action
      icon={Icon.Music}
      title="Start Radio"
      onAction={async () => {
        if (closeWindowOnAction) {
          await startRadio({
            trackIds: trackId ? [trackId] : undefined,
            artistIds: artistId ? [artistId] : undefined,
          });
          await showHUD("Playing Radio");
          await popToRoot();
          return;
        }
        const toast = await showToast({ title: "Starting radio...", style: Toast.Style.Animated });

        await startRadio({
          trackIds: trackId ? [trackId] : undefined,
          artistIds: artistId ? [artistId] : undefined,
        });

        if (!revalidate) {
          toast.title = "Playing radio";
          toast.style = Toast.Style.Success;
        }

        if (revalidate) {
          // The Start Radio API call is not instant, so we need to wait a bit before revalidating
          setTimeout(() => {
            revalidate();
            toast.title = "Playing radio";
            toast.style = Toast.Style.Success;
          }, 300);
        }
      }}
    />
  );
}
