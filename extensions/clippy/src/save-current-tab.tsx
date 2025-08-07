import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getActiveTab } from "../lib/use-active-tab";
import { saveLink } from "../lib/api";
import { API_URL } from "../lib/api-url";
import { authorize } from "../lib/oauth";

export default async function Command() {
  let loadingToast: Toast | null = null;

  try {
    const activeTab = await getActiveTab();

    if (!activeTab) {
      await showFailureToast(new Error("Please open a browser tab and try again"), { title: "No active tab found" });
      return;
    }

    // Show loading toast
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving link...",
    });

    const token = await authorize();
    const result = await saveLink({
      url: activeTab,
      token,
      apiUrl: API_URL,
    });

    if (!result.success) {
      throw new Error(result.error || "Please try again");
    }

    // Hide loading toast and show success
    loadingToast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Link saved!",
      message: activeTab,
    });

    // Wait 300ms then close Raycast UI
    setTimeout(() => closeMainWindow(), 500);
  } catch (error) {
    // Hide loading toast if it exists
    if (loadingToast) {
      loadingToast.hide();
    }
    await showFailureToast(error, { title: "Link save failed" });
  }
}
