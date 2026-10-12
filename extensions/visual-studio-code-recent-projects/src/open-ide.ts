import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { build } from "./lib/preferences";
import { openEditorWindow } from "./utils/open-editor-window";

export default async function command() {
  try {
    await closeMainWindow();
    await openEditorWindow(build);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open IDE" });
  }
}
