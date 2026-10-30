import { Clipboard, getSelectedText, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { saveSheetUrl, TextFormat } from "./ulysses-url";
import { getPreferences, openUlyssesCallback } from "./utils";

async function selectedText() {
  try {
    return await getSelectedText();
  } catch {
    // Throws when nothing is selected in the frontmost app.
    return undefined;
  }
}

export default async function CaptureText(props: LaunchProps<{ arguments: Arguments.CaptureText }>) {
  const text = props.arguments.text?.trim() || (await selectedText())?.trim() || (await Clipboard.readText())?.trim();

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to capture",
      message: "Type some text, select text, or copy something first.",
    });
    return;
  }

  const preferences = getPreferences();
  const background = !preferences.showInUlysses;
  const url = saveSheetUrl({
    text,
    group: preferences.defaultGroup,
    format: preferences.format as TextFormat,
    silent: background,
  });
  if (await openUlyssesCallback(url, { background })) {
    await showHUD("Saved to Ulysses");
  }
}
