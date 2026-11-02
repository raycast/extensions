import { open, showToast, Toast } from "@raycast/api";
import { storeUrl } from "./core";

/** Shows why something did not work, with a way to the Mac App Store when installing or updating the app is the fix. */
export async function failure(title: string, error: unknown) {
  const message = (error as Error).message;
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: message.includes("Mac App Store")
      ? { title: "Open Mac App Store", onAction: () => open(storeUrl) }
      : undefined,
  });
}
