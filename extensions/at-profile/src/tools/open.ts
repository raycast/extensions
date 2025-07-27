import { open } from "@raycast/api";
import { getAllApps, addToProfileHistory } from "../hooks/apps";
import { showFailureToast } from "@raycast/utils";
import { Input } from "../types";

const tool = async (input: Input) => {
  const { profile, app } = input;
  const allApps = await getAllApps();
  const selectedApp = allApps.find((s) => s.value === app);
  if (!selectedApp) {
    showFailureToast(`App "${app}" not found or not enabled`, { title: "Failed to find app" });
    return;
  }

  // Normalize profile (remove leading @ if present)
  const normalizedProfile = profile.startsWith("@") ? profile.slice(1) : profile;

  const url = selectedApp.urlTemplate.replace("{profile}", normalizedProfile);
  try {
    await open(url);
  } catch (error) {
    showFailureToast(`Failed to open ${app} profile: ${profile}`, { title: "Failed to open URL" });
    return;
  }

  // Add profile to history after successful open (don't let history failures affect main operation)
  try {
    await addToProfileHistory(normalizedProfile);
  } catch (error) {
    // Log the error but don't show it to user since the main operation succeeded
    console.error("Failed to add profile to history:", error);
  }
};
export default tool;
