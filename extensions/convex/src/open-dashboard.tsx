/**
 * Open Dashboard Command
 *
 * Opens the current deployment in the Convex dashboard.
 * No-view command that immediately opens the browser.
 * Works in both OAuth and deploy key mode.
 */

import { open, showToast, Toast } from "@raycast/api";
import { loadSession, loadSelectedContext } from "./lib/auth";
import { getDeployKeyConfigAsync } from "./lib/deployKeyAuth";

export default async function OpenDashboardCommand() {
  const baseUrl = "https://dashboard.convex.dev";

  // Deploy key mode: the dashboard resolves deployments directly by name
  const deployKeyConfig = await getDeployKeyConfigAsync();
  if (deployKeyConfig) {
    await open(`${baseUrl}/d/${deployKeyConfig.deploymentName}`);
    return;
  }

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

  if (
    selectedContext.teamSlug &&
    selectedContext.projectSlug &&
    selectedContext.deploymentType
  ) {
    const url = `${baseUrl}/t/${selectedContext.teamSlug}/${selectedContext.projectSlug}/${selectedContext.deploymentType}`;
    await open(url);
  } else {
    await open(`${baseUrl}/d/${selectedContext.deploymentName}`);
  }
}
