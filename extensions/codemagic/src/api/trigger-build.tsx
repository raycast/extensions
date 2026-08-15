import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface TriggerBuildParams {
  appId: string;
  workflowId: string;
  branch: string;
}

export const triggerBuild = async ({ appId, workflowId, branch }: TriggerBuildParams): Promise<void> => {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast(Toast.Style.Animated, "Triggering build...");

  try {
    const response = await fetch("https://api.codemagic.io/builds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences["codemagic-access-token"]}`,
      },
      body: JSON.stringify({
        appId: appId,
        workflowId: workflowId,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to trigger build";
      toast.message = error;
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Build triggered successfully";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to trigger build";
    toast.message = String(error);
  }
};
