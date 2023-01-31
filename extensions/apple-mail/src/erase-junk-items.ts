import { Alert, confirmAlert, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { eraseDeletedItems } from "./utils";

export default async function Command() {
  const options: Alert.Options = {
    title: "Permanently Erase Junk Items",
    message: "Are you sure?",
    primaryAction: {
      title: "Erase",
      style: Alert.ActionStyle.Destructive,
    },
  };

  if (!(await confirmAlert(options))) {
    return;
  }

  try {
    await eraseDeletedItems();
    await showHUD("Cleared junk messages");
  } catch (error) {
    console.log("E-J-1", error);
    await popToRoot();
    await showToast({ title: "Failed to clear junk messages", style: Toast.Style.Failure });
  }
}
