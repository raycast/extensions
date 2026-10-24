import { type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    await showFailureToast(error, { title: "Timer action needs attention" });
  }
}
