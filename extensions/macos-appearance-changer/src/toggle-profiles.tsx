import { showToast, Toast } from "@raycast/api";
import { applyProfile as applyProfileToSystem } from "swift:../swift";
import { Profiles } from "./lib/profiles";
import { TogglePair } from "./lib/toggle-pair";
import { resolveIconThemePreference } from "./utils/resolve-icon-theme.util";

export default async function ToggleProfiles() {
  const [profiles, pair] = await Promise.all([Profiles.getAll(), TogglePair.load()]);

  if (!pair) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No toggle pair configured",
      message: "Use Configure Toggle Pair first",
    });
    return;
  }

  const profileA = profiles.find((p) => p.id === pair.profileIdA);
  const profileB = profiles.find((p) => p.id === pair.profileIdB);

  if (!profileA || !profileB) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Toggle pair invalid",
      message: "One or both profiles were deleted",
    });
    return;
  }

  const next = pair.lastAppliedId === pair.profileIdA ? profileB : profileA;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling…", message: next.name });

  try {
    // Save state before applying so concurrent invocations see the updated
    // lastAppliedId immediately and don't race to apply the same profile.
    await TogglePair.save({ ...pair, lastAppliedId: next.id });
    const iconTheme = resolveIconThemePreference(next.iconStyle, next.iconMode);
    await applyProfileToSystem(next.wallpaperPath, iconTheme, next.appearance);
    toast.style = Toast.Style.Success;
    toast.title = "Profile applied";
    toast.message = next.name;
  } catch (error) {
    // Roll back to the previous lastAppliedId so the next toggle attempt
    // targets the correct profile.
    await TogglePair.save(pair);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle";
    toast.message = String(error);
  }
}
