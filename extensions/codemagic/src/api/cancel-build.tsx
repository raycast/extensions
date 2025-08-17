import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch"; // Ensure node-fetch is installed

export const cancelBuild = async (buildId: string): Promise<void> => {
  const url = `https://api.codemagic.io/builds/${buildId}/cancel`;
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast(Toast.Style.Animated, "Canceling Build", `Canceling build`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": preferences["codemagic-access-token"],
      },
    });

    if (response.status === 208) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cannot Cancel Build";
      toast.message = "Build has already finished or been processed.";
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to cancel the build: ${response.statusText}`);
    }
    toast.style = Toast.Style.Success;
    toast.title = "Build Canceled";
    toast.message = "Build has been successfully canceled.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to cancel the build";
  }
};
