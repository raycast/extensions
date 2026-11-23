import { environment, Icon, type LaunchProps } from "@raycast/api";
import { SendSource } from "./components/SendSource";
import { readClipboardContent } from "./lib/clipboard";
import type { QuickSendSetupContext } from "./lib/quick-send";

export default function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendSetupContext }>) {
  return (
    <SendSource
      read={() => readClipboardContent(environment.supportPath)}
      empty={{
        icon: Icon.Clipboard,
        title: "Clipboard Is Empty",
        failedTitle: "Couldn't Read the Clipboard",
        description: "Copy text, an image or files, then try again.",
        prefer: "text",
      }}
      launchContext={launchContext}
    />
  );
}
