import { showToast, Toast } from "@raycast/api";
import { shutPrl } from "./actions";

export default async function ShutdownCommand(): Promise<JSX.Element | null> {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Shutting down Parallels…" });
    await shutPrl();
    await showToast({ style: Toast.Style.Success, title: "Parallels shut down" });
  } catch (error: any) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not shut down Parallels",
      message: error?.message || String(error),
    });
  }

  return null;
}
