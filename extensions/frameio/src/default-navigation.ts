import { getPreferenceValues } from "@raycast/api";
import { logout } from "./auth";
import { debug } from "./debug";

export async function applyPreferenceSideEffects(): Promise<void> {
  const prefs = getPreferenceValues<{ signOut?: boolean }>();

  if (prefs.signOut) {
    await logout();
    debug.info("Signed out via extension preference");
  }
}
