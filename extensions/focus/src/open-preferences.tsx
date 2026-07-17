import { closeMainWindow } from "@raycast/api";
import { openPreferences } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function () {
  if (!(await ensureFocusIsRunning())) {
    return;
  }

  await closeMainWindow();
  await openPreferences();
}
