import { environment, type LaunchProps } from "@raycast/api";
import { readClipboardContent } from "./lib/clipboard";
import { quickSend, type QuickSendLaunchContext } from "./lib/quick-send";

export default async function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendLaunchContext }>) {
  await quickSend(() => readClipboardContent(environment.supportPath), {
    emptyMessage: "Clipboard Is Empty",
    pickerCommand: "send-clipboard",
    launchContext,
  });
}
