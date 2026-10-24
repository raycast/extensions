import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isUserCancelled } from "./labels";

// Shows why a command failed. A cancelled Touch ID or password prompt is not an error, so it gets a plain notice.
export async function showCommandFailure(error: unknown, title: string): Promise<void> {
  if (isUserCancelled(error)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication canceled",
      message: "Doorstopper was not changed",
    });
    return;
  }
  await showFailureToast(error, { title });
}
