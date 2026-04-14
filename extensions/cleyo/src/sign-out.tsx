/**
 * Sign Out command - disconnects from Cleyo
 */

import { showToast, Toast, showHUD } from "@raycast/api";
import { disconnect, isAuthenticated } from "./lib/auth";

export default async function SignOut() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    await showHUD("Not signed in");
    return;
  }

  await disconnect();
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out",
    message: "You have been disconnected from Cleyo",
  });
}
