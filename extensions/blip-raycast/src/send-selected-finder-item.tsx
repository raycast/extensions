import { Icon, type LaunchProps } from "@raycast/api";
import { SendSource } from "./components/SendSource";
import type { QuickSendSetupContext } from "./lib/quick-send";
import { fileManagerName, readSelectionContent } from "./lib/selection";

export default function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendSetupContext }>) {
  return (
    <SendSource
      read={readSelectionContent}
      empty={{
        icon: Icon.Finder,
        title: "No Files Selected",
        failedTitle: `Couldn't Read the ${fileManagerName} Selection`,
        description: `Select files or folders in ${fileManagerName}, then try again.`,
        prefer: "files",
      }}
      launchContext={launchContext}
    />
  );
}
