import { getPreferenceValues, openCommandPreferences, showHUD } from "@raycast/api";
import { UserPage } from "./components/user-page";

export default () => {
  const { myUserId } = getPreferenceValues<Preferences.GetMyAccount>();

  const userId = Number(myUserId);
  if (!userId) {
    showHUD("🔴 Invalid User ID!");
    openCommandPreferences();
    return <></>;
  }

  return <UserPage userId={userId} copyField="UserID" />;
};
