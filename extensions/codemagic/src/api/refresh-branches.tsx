import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

// Reuse refreshBranches function
export const refreshBranches = async (appId: string): Promise<null> => {
  const preferences = getPreferenceValues<Preferences>();
  const url = `https://api.codemagic.io/apps/${appId}/update_repository_url`;
  const token = preferences["codemagic-access-token"];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token,
      },
    });
    if (response.status === 202) {
      return null;
    } else {
      return null;
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to update branches");
    console.error(error);
    return null;
  }
};
