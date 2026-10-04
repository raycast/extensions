import { Clipboard, getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { extractColor } from "./lib/colors";

export default async function Command() {
  try {
    let selected = "";
    try {
      selected = await getSelectedText();
    } catch {
      /* Apps without selected text can still use the clipboard. */
    }
    const color = extractColor(selected) ?? extractColor((await Clipboard.readText()) ?? "");
    if (!color) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No color found",
        message: "Select or copy a hex, CSS color name, RGB, or HSL value.",
        primaryAction: {
          title: "Search Art by Color",
          onAction: () => launchCommand({ name: "find-art-by-color", type: LaunchType.UserInitiated }),
        },
      });
      return;
    }
    await launchCommand({ name: "find-art-by-color", type: LaunchType.UserInitiated, context: { hex: color } });
  } catch (error) {
    await showFailureToast(error, { title: "Could not search from clipboard or selection" });
  }
}
