import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { addToHistory } from "./history";
import { getFormattedColor, pickColor } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const pickedColor = await pickColor();
    if (!pickedColor) {
      return;
    }

    addToHistory(pickedColor);

    const hex = getFormattedColor(pickedColor);
    await Clipboard.copy(hex);

    await showHUD("Copied color to clipboard");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed picking color",
      message: e instanceof Error ? e.message : String(e),
      primaryAction: {
        title: "Copy Error",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        async onAction(toast) {
          await Clipboard.copy(e instanceof Error ? e.message : String(e));
          await toast.hide();
        },
      },
    });
  }
}
