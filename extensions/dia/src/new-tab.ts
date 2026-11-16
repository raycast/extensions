import { closeMainWindow, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DIA_APPLICATION, isWindows } from "./platform";
import { runWindowsAutomation } from "./windows-automation";

export default async function Command() {
  try {
    await closeMainWindow();
    if (isWindows) await runWindowsAutomation("new-tab");
    else await open("chrome://newtab", DIA_APPLICATION);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open a new Dia tab" });
  }
}
