import { showToast, Toast } from "@raycast/api";
import { shutPrl } from "./actions";
import { showFailureToast } from "@raycast/utils";

export default async function ShutdownCommand(): Promise<void> {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Shutting down Parallels…" });
    await shutPrl();
    await showToast({ style: Toast.Style.Success, title: "Parallels shut down" });
  } catch (error) {
    console.error(error);
    await showFailureToast(error, {
      message: "Failed to shut down Parallels",
    });
  }
}
