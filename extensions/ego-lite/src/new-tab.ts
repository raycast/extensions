import { closeMainWindow } from "@raycast/api";

import { createBlankTab, showEgoLiteFailure } from "./lib/ego-lite";

export default async function Command() {
  try {
    await closeMainWindow();
    await createBlankTab();
  } catch (error) {
    await showEgoLiteFailure(error, "Could not create an Ego Lite tab");
  }
}
