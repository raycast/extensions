import { showToast, Toast } from "@raycast/api";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default async function UpdateGravity() {
  if (!isV6()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This command requires Pi-hole v6",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Updating gravity...",
    message: "This may take a moment",
  });

  try {
    const api = getPiholeAPI();
    await api.updateGravity();
    await showToast({
      style: Toast.Style.Success,
      title: "Gravity updated successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to update gravity",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
