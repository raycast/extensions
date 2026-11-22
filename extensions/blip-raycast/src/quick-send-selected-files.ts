import type { LaunchProps } from "@raycast/api";
import { quickSend, type QuickSendLaunchContext } from "./lib/quick-send";
import { fileManagerName, readSelectionContent } from "./lib/selection";

export default async function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendLaunchContext }>) {
  await quickSend(readSelectionContent, {
    emptyMessage: `No Files Selected in ${fileManagerName}`,
    pickerCommand: "send-selected-finder-item",
    launchContext,
  });
}
