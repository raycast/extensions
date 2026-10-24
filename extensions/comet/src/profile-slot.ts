import { getPreferenceValues, LaunchProps, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { findProfile, getProfiles } from "./profiles";
import { openProfile } from "./profile-launch";
import { checkCometInstallation } from "./util";

/** All five "Profile N" commands share the same preference and argument shape; Profile1 stands in for each. */
export type SlotProps = LaunchProps<{ arguments: Arguments.Profile1 }>;

/** Body of the "Profile N" commands: open whichever profile the command's preference names. */
export async function runSlot(props: SlotProps): Promise<void> {
  if (!(await checkCometInstallation())) return;

  const wanted = getPreferenceValues<Preferences.Profile1>().profile;
  const profiles = getProfiles();
  const profile = findProfile(wanted, profiles);
  if (!profile) {
    await showToast({
      style: Toast.Style.Failure,
      title: `No Comet profile called “${wanted}”`,
      message: profiles.length ? `Available: ${profiles.map((p) => p.name).join(", ")}` : "No Comet profiles found.",
      primaryAction: { title: "Change Profile", onAction: () => openCommandPreferences() },
    });
    return;
  }

  await openProfile(profile, { url: props.arguments.url }, profiles.length);
}
