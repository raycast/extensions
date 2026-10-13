import { Icon, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { ProfileList } from "./components/profile-list";
import { MissingDependency } from "./components/missing-dependency";
import { openConsole } from "./lib/assume";
import { isGrantedInstalled } from "./lib/dependencies";
import { listAwsProfiles } from "./lib/profiles";

export default function Command() {
  const profiles = useMemo(() => listAwsProfiles(), []);
  const grantedInstalled = useMemo(() => isGrantedInstalled(), []);

  async function handleSelect(profileName: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening console for ${profileName}`,
    });
    try {
      await openConsole(profileName);
      toast.style = Toast.Style.Success;
      toast.title = `Opened console for ${profileName}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open console";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  if (!grantedInstalled) {
    return <MissingDependency />;
  }

  return (
    <ProfileList
      profiles={profiles}
      actionTitle="Open AWS Console"
      actionIcon={Icon.Globe}
      onSelect={(profile) => handleSelect(profile.name)}
    />
  );
}
