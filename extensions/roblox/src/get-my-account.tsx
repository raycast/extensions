import { getPreferenceValues, openExtensionPreferences, showHUD } from "@raycast/api";
import { UserPage } from "./components/user-page";

export default () => {
  const { userId: myUserId } = getPreferenceValues<Preferences>();

  const userId = Number(myUserId);
  if (!userId) {
    showHUD("🔴 You must set a valid User ID first!");
    openExtensionPreferences();
    return <></>;
  }

  return <UserPage userId={userId} copyField="UserID" />;
};
