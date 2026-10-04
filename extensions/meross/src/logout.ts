import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { forgetStoredLogin, hasStoredLogin, MerossSession } from "./lib/meross";

export default async function Command() {
  if (!(await hasStoredLogin())) {
    await showHUD("Not logged in to Meross");
    return;
  }
  try {
    const session = await MerossSession.open();
    await session.logout();
    await showHUD("Logged out of Meross");
  } catch (error) {
    // Even if the server call fails, drop the local token so the next command logs in fresh.
    await forgetStoredLogin();
    await showFailureToast(error, { title: "Meross logout failed, stored login was removed" });
  }
}
