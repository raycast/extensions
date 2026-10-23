import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { openNewTab } from "./actions";
import { DEFAULT_BRAVE_PROFILE_ID } from "./constants";

export default async function Command() {
  try {
    const { openTabInProfile } = getPreferenceValues<Preferences>();
    await closeMainWindow();
    await openNewTab({
      profileCurrent: DEFAULT_BRAVE_PROFILE_ID,
      openTabInProfile,
      newWindow: true,
    });
  } catch {
    await showHUD("❌ Failed opening a new Brave window");
  }
}
