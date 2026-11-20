import { Clipboard, LaunchProps, Toast, showToast } from "@raycast/api";
import { CaptureContext, capture } from "./lib/capture";

export default async function CaptureClipboard(
  props: LaunchProps<{ launchContext?: CaptureContext }>,
) {
  const text = (await Clipboard.readText()) ?? "";
  if (!text.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }
  await capture(text, props.launchContext?.vaultPath);
}
