import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { getError } from "../helpers/getError";

type AddToQueueActionProps = {
  uri: string;
  title: string;
};

export function AddToQueueAction({ uri, title }: AddToQueueActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <Action
      icon={Icon.Plus}
      title="Add To Queue"
      shortcut={{ modifiers: ["opt"], key: "q" }}
      onAction={async () => {
        try {
          await addToQueue({ uri });
          if (closeWindowOnAction) {
            await showHUD("Added to queue");
            await popToRoot();
            return;
          }
          showToast({ title: "Added to queue", message: title });
        } catch (err) {
          const error = getError(err);
          showToast({
            title: "Error adding song to queue",
            message: error.message,
            style: Toast.Style.Failure,
          });
        }
      }}
    />
  );
}
