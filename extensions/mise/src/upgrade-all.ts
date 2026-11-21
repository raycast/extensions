import { launchCommand, LaunchType } from "@raycast/api";
import type { MiseLocation } from "./mise/locate";
import { upgrade } from "./mise/operations";
import { readPreferences, upgradeOptions } from "./ui/preferences";
import { runOperationWithoutView } from "./ui/runOperation";

export default function Command() {
  const prefs = readPreferences<Preferences.UpgradeAll>();
  const op = (location: MiseLocation) =>
    upgrade(undefined, { ...upgradeOptions(prefs, location), prune: prefs.pruneReplaced });
  return runOperationWithoutView(op, () => {
    launchCommand({ name: "outdated-tools", type: LaunchType.Background }).catch(() => undefined);
  });
}
