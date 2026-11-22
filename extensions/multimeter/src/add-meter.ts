import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { ensureInstalled, openLink } from "./multimeter";

export default async function Command() {
  if (!(await ensureInstalled())) return;
  try {
    await closeMainWindow();
    await openLink("multimeter://add", false);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Multimeter",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
