import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { defaultRoots, rebuildRoots } from "./lib/folder-index";
import { getPrefs } from "./lib/prefs";

export default async function Command() {
  const prefs = getPrefs();
  const roots = prefs.roots.length ? prefs.roots : defaultRoots();
  const manual = environment.launchType === LaunchType.UserInitiated;

  const toast = manual ? await showToast({ style: Toast.Style.Animated, title: "Indexing folders…" }) : undefined;
  await rebuildRoots(roots, prefs.indexDepth, ({ total, scanning }) => {
    if (toast) toast.message = `${total.toLocaleString()} folders · scanning ${scanning.join(", ")}`;
  });
  if (manual) await showHUD("Folder index updated");
}
