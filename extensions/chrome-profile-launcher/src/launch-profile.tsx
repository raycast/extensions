import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { launchProfile } from "./lib/chrome-launcher";
import { loadProfiles, resolveProfileQuery } from "./lib/chrome-profiles";

/**
 * No-view command: launch a specific Chrome profile by name/directory passed as
 * an argument. Designed for Raycast quicklinks + global hotkeys — bind a key to
 * a quicklink (created from the list) and that profile opens on the current
 * desktop, no Raycast UI.
 */
export default async function LaunchProfile(props: LaunchProps<{ arguments: { profile: string } }>) {
  const query = props.arguments.profile;
  try {
    const match = resolveProfileQuery(await loadProfiles(), query);
    if (!match) {
      await showFailureToast(new Error(`No Chrome profile matches "${query}".`), { title: "Profile not found" });
      return;
    }
    await launchProfile(match.directory);
    await showHUD(`Opened ${match.name}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Chrome" });
  }
}
