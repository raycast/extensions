/**
 * Copy Deployment URL Command
 *
 * Copies the current deployment URL to clipboard.
 * No-view command that immediately copies.
 * Works in both OAuth and deploy key mode.
 */

import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { loadSession, loadSelectedContext } from "./lib/auth";
import { getDeployKeyConfigAsync } from "./lib/deployKeyAuth";

export default async function CopyDeploymentUrlCommand() {
  // Deploy key mode: the config already carries the exact deployment URL,
  // including custom/self-hosted ones
  const deployKeyConfig = await getDeployKeyConfigAsync();
  if (deployKeyConfig) {
    await Clipboard.copy(deployKeyConfig.deploymentUrl);
    await showHUD(`Copied: ${deployKeyConfig.deploymentUrl}`);
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

  const url =
    selectedContext.deploymentUrl ??
    `https://${selectedContext.deploymentName}.convex.cloud`;
  await Clipboard.copy(url);
  await showHUD(`Copied: ${url}`);
}
