/**
 * Open Dashboard Command
 *
 * Opens the current deployment in the Convex dashboard.
 * No-view command that immediately opens the browser.
 */

import { open, showToast, Toast } from "@raycast/api";
import { loadSession, loadSelectedContext } from "./lib/auth";

export default async function OpenDashboardCommand() {
  const session = await loadSession();
  const selectedContext = await loadSelectedContext();

  if (!session) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not signed in",
      message: "Use 'Manage Projects' to sign in first",
    });
    return;
  }

  if (!selectedContext.deploymentName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No deployment selected",
      message: "Use 'Manage Projects' to select a deployment first",
    });
    return;
  }

  // Build dashboard URL using the stored context
  const baseUrl = "https://dashboard.convex.dev";

  if (
    selectedContext.teamSlug &&
    selectedContext.projectSlug &&
    selectedContext.deploymentType
  ) {
    const url = `${baseUrl}/t/${selectedContext.teamSlug}/${selectedContext.projectSlug}/${selectedContext.deploymentType}`;
    await open(url);
  } else {
    // Fallback to base dashboard
    await open(baseUrl);
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Opening Dashboard",
  });
}
