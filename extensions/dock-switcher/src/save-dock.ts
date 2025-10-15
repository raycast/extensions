import { LaunchProps, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { addToHistory, existsInHistory, removeFromHistory } from "./utils/history";
import { execDockutil } from "./utils/exec-dockutil";

interface SaveDockArguments {
  profileName: string;
}

export default async function Command(props: LaunchProps<{ arguments: SaveDockArguments }>) {
  const { profileName } = props.arguments;

  try {
    const exists = await existsInHistory(profileName);

    if (exists) {
      const confirmed = await confirmAlert({
        title: "Profile Already Exists",
        message: `A profile named "${profileName}" already exists. Do you want to replace it?`,
        primaryAction: {
          title: "Replace",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (confirmed) await removeFromHistory(profileName);
      else return;
    }

    const output = execDockutil("--list");

    if (!output) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No dock items found",
        message: "Your dock appears to be empty",
      });
      return;
    }

    // Parse the output to get dock items
    // dockutil --list format: <name>\t<path>\t<type>\t<plist>\t<bundle_id>
    const dockItems = output
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const columns = line.split("\t");
        return {
          name: columns[0]?.trim() || "",
          path: columns[1]?.trim() || "",
          type: columns[2]?.trim() || "",
        };
      })
      .filter((item) => item.name !== "");

    await addToHistory({
      profileName,
      dockItems,
      timestamp: Date.now(),
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Profile saved",
      message: `"${profileName}" saved with ${dockItems.length} items`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save profile",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
