import { getFocusedTab, isAutomationPermissionError } from "../lib/browser";

export default async function tool() {
  try {
    const tab = await getFocusedTab();
    if (!tab) {
      return { tab: null, permissionDenied: false, message: "No active non-private tab found in Search Browser." };
    }
    return {
      permissionDenied: false,
      tab: {
        title: tab.title,
        url: tab.url,
        windowId: tab.windowId,
        space: tab.space,
        profile: tab.profile,
      },
    };
  } catch (error) {
    if (isAutomationPermissionError(error)) {
      return {
        tab: null,
        permissionDenied: true,
        message: "Automation permission is required for Raycast to read tabs from Search Browser.",
      };
    }
    throw error;
  }
}
