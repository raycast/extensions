import { usePromise } from "@raycast/utils";
import { clearLastNotifyTime, getTodaysDigest } from "../store";
import { Action, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";

export default function GenDigestInBGAction(props: {
  autoFocus?: boolean;
  onSuccess?: () => void;
  onClick?: () => void;
}) {
  const { autoFocus, onSuccess, onClick } = props;
  const { data: todaysDigest } = usePromise(getTodaysDigest);
  return (
    <Action
      title={todaysDigest ? "Regenerate Digest In Background" : "Generate Digest In Background"}
      icon="send-to-back.svg"
      autoFocus={autoFocus}
      onAction={async () => {
        onClick?.();
        await clearLastNotifyTime();

        showToast(Toast.Style.Success, "Digest generating in background, you will be notified when it's done.");

        await launchCommand({
          name: "auto-digest.command",
          type: LaunchType.Background,
          context: { regenerate: !!todaysDigest },
        });
        onSuccess?.();
      }}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
    />
  );
}
