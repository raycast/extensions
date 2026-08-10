import { getPreferenceValues } from "@raycast/api";
import { makeCommand } from "./_factory";
import { SubMenuType } from "./constants";
import { runRaycastRestore } from "./raycastRestore";

export default async () => {
  const prefs = getPreferenceValues<Preferences.Command>();

  await makeCommand(prefs.menuName, SubMenuType.MoveResize)();

  if (prefs.alsoRaycastRestore) {
    await runRaycastRestore();
  }
};
