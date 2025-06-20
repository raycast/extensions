import { getPreferenceValues } from "@raycast/api";
import { makeCommand } from "./_factory";
import { runRaycastRestore } from "./raycastRestore";

export default async () => {
  const prefs = getPreferenceValues<Preferences.Command>();

  await makeCommand(prefs.menuName, "moveResize")();

  if (prefs.alsoRaycastRestore) {
    await runRaycastRestore();
  }
};
