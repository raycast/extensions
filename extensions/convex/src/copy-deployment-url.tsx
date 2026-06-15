/**
 * Copy Deployment URL Command
 *
 * Copies the current deployment URL to clipboard.
 * No-view command that immediately copies.
 */

import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { loadSession, loadSelectedContext } from "./lib/auth";

export default async function CopyDeploymentUrlCommand() {
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

  const url = `https://${selectedContext.deploymentName}.convex.cloud`;
  await Clipboard.copy(url);
  await showHUD(`Copied: ${url}`);
}
