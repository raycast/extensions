import { Alert, LaunchProps, confirmAlert, showHUD, trash } from "@raycast/api";
import { join } from "node:path";
import { getConfiguredFolders, getLaunchFolders, inspectFolder } from "./folders";

type LaunchContext = {
  folders?: string[];
};

function getFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to move items to Trash";
}

export default async function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  try {
    const paths = props.launchContext?.folders ? getLaunchFolders(props.launchContext.folders) : getConfiguredFolders();
    const inspections = await Promise.all(paths.map(inspectFolder));
    const folders = inspections.filter((folder) => folder.status === "found");

    if (folders.length === 0) {
      await showHUD("Configured folders not found");
      return;
    }

    const itemPaths = folders.flatMap((folder) => folder.entries.map((entry) => join(folder.path, entry)));

    if (itemPaths.length === 0) {
      await showHUD("✨ Nothing to clean");
      return;
    }

    const confirmed = await confirmAlert({
      title: `Move ${itemPaths.length} items to Trash?`,
      message: folders.map((folder) => `${folder.label}: ${folder.entries.length}`).join("\n"),
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await trash(itemPaths);

    await showHUD(`🗑️ Moved ${itemPaths.length} items to Trash`);
  } catch (error) {
    await showHUD(getFailureMessage(error));
  }
}
