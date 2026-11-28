import { LaunchProps, Toast, getSelectedText, showToast } from "@raycast/api";
import { CaptureContext, capture } from "./lib/capture";

export default async function CaptureSelection(
  props: LaunchProps<{ launchContext?: CaptureContext }>,
) {
  const text = await getSelectedText().catch(() => "");
  if (!text.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "No text selected" });
    return;
  }
  await capture(text, props.launchContext?.vaultPath);
}
