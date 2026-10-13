import { getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { ProfileList } from "./components/profile-list";
import { MissingDependency } from "./components/missing-dependency";
import { openCliSession } from "./lib/assume";
import { isGrantedInstalled } from "./lib/dependencies";
import { ExtensionPreferences } from "./lib/preferences";
import { listAwsProfiles } from "./lib/profiles";

export default function Command() {
  const { terminalApp } = getPreferenceValues<ExtensionPreferences>();
  const profiles = useMemo(() => listAwsProfiles(), []);
  const grantedInstalled = useMemo(() => isGrantedInstalled(), []);

  async function handleSelect(profileName: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening CLI session for ${profileName}`,
    });
    try {
      await openCliSession(profileName, terminalApp);
      toast.style = Toast.Style.Success;
      toast.title = `Opened CLI session for ${profileName}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open CLI session";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  if (!grantedInstalled) {
    return <MissingDependency />;
  }

  return (
    <ProfileList
      profiles={profiles}
      actionTitle="Open AWS CLI"
      actionIcon={Icon.Terminal}
      onSelect={(profile) => handleSelect(profile.name)}
    />
  );
}
