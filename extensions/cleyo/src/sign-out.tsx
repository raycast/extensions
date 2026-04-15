/**
 * Sign Out command - disconnects from Cleyo
 */

import { showHUD } from "@raycast/api";
import { disconnect, isAuthenticated } from "./lib/auth";

export default async function SignOut() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    await showHUD("Not signed in");
    return;
  }

  await disconnect();
  await showHUD("Signed out from Cleyo");
}
