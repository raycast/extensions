import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getVSCodeCLI } from "./lib/vscode";

export default async function command() {
  try {
    await closeMainWindow();
    await getVSCodeCLI().openIDE();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open IDE" });
  }
}
