import { open } from "@raycast/api";
import { getAllApps, addToProfileHistory } from "../helpers/apps";
import { safeAsyncOperation, showError } from "../utils/errors";
import { sanitizeUrl } from "../utils/url-sanitize";
import { Input } from "../types";

const tool = async (input: Input) => {
  const { profile, app } = input;
  const allApps = await getAllApps();
  const selectedApp = allApps.find((s) => s.value === app);
  if (!selectedApp) {
    showError(`App "${app}" not found or not shown`, "Failed to find app");
    return;
  }

  // Normalize profile (remove leading @ if present)
  const normalizedProfile = profile.startsWith("@") ? profile.slice(1) : profile;

  const url = selectedApp.urlTemplate.replace("{profile}", normalizedProfile);

  const openResult = await safeAsyncOperation(
    async () => {
      const sanitizedUrl = sanitizeUrl(url);
      await open(sanitizedUrl);
    },
    `Open ${app} profile: ${profile}`,
    { toastTitle: "Failed to open URL" },
  );

  if (!openResult) {
    return;
  }

  // Add profile to history after successful open (don't let history failures affect main operation)
  await safeAsyncOperation(
    async () => {
      await addToProfileHistory(normalizedProfile);
    },
    "Add profile to history",
    { showToastOnError: false }, // Don't show toast for history failures since main operation succeeded
  );
};
export default tool;
