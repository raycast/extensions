import { Action, Icon, Toast, showToast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { WatchWithID, WatchesResponse } from "@/types";
import { callApi } from "@/utils";

type SeenUnseenActionProps = {
  /**
   * Whether to mark the watch as seen (`true`) or unseen (`false`)
   */
  markAsSeen: boolean;
  watch: WatchWithID;
  mutate: MutatePromise<WatchesResponse | undefined, WatchesResponse | undefined, unknown>;
};

export const SeenUnseenAction = ({ markAsSeen, watch, mutate }: SeenUnseenActionProps) => {
  const actionTitle = markAsSeen ? "Seen" : "Unseen";
  return (
    <Action
      icon={markAsSeen ? Icon.Eye : Icon.EyeDisabled}
      title={`Mark as ${actionTitle}`}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={async () => {
        const toast = await showToast(Toast.Style.Animated, `Marking as ${actionTitle}`);
        try {
          // Unix timestamp in seconds of the last time the watch was viewed
          await mutate(
            callApi(`watch/${watch.id}`, {
              method: "PUT",
              body: { last_viewed: markAsSeen ? Math.floor(Date.now() / 1000) : 0 },
            }),
            {
              shouldRevalidateAfter: true,
            },
          );
          toast.style = Toast.Style.Success;
          toast.title = `Marked as ${actionTitle}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
          toast.message = `${error}`;
        }
      }}
    />
  );
};
