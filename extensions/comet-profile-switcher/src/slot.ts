import { getPreferenceValues, LaunchProps, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { findProfile, getProfiles, isCometInstalled } from "./comet";
import { openProfile } from "./launch";

export type SlotProps = LaunchProps<{ arguments: { url?: string } }>;

/** Body of the "Profile N" commands: open whichever profile the command's preference names. */
export async function runSlot(props: SlotProps): Promise<void> {
  if (!isCometInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Comet is not installed",
      message: "Set the Comet Application in the extension preferences.",
    });
    return;
  }

  const wanted = getPreferenceValues<{ profile: string }>().profile;
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
