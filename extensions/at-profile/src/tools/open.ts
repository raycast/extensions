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
    // Add profile to history after successful open
    await addToProfileHistory(normalizedProfile);
  } catch (error) {
    showFailureToast(`Failed to open ${app} profile: ${profile}`, { title: "Failed to open URL" });
  }
};
export default tool;
