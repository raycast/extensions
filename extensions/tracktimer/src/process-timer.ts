import { type LaunchProps, showToast, Toast } from "@raycast/api";
import { session } from "./session";

/** A separate command lifecycle keeps network work independent of the timer view. */
export default async function Command(
  props: LaunchProps<{ launchContext: { operationId?: string; connectionId?: string } }>,
) {
  try {
    await session().processPending(
      props.launchContext?.operationId,
      props.launchContext?.connectionId,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Timer action needs attention",
      message:
        error instanceof Error ? error.message : "Open TrackTimer to retry the pending action.",
    });
  }
}
