import { launchCommand, LaunchType } from "@raycast/api";
import { upgrade } from "./mise/operations";
import { readPreferences, upgradeOptions } from "./ui/preferences";
import { runOperationWithoutView } from "./ui/runOperation";

export default function Command() {
  const prefs = readPreferences<Preferences.UpgradeAll>();
  const op = upgrade(undefined, { ...upgradeOptions(prefs), prune: prefs.pruneReplaced });
  return runOperationWithoutView(op, () => {
    launchCommand({ name: "outdated-tools", type: LaunchType.Background }).catch(() => undefined);
  });
}
