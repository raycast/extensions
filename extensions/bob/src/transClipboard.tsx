import { buildScriptEnsuringBobIsRunning, isEmpty, runAppleScriptSilently } from "./utils";
import { Clipboard, showHUD } from "@raycast/api";

export default async () => {
  const clipboardText = await Clipboard.readText();
  if (isEmpty(clipboardText)) {
    await showHUD("No text in clipboard");
  } else {
    const script = buildScriptEnsuringBobIsRunning(
      `tell application "Bob"
    launch
    translate "` +
        clipboardText +
        ` "
end tell`
    );
    await runAppleScriptSilently(script);
    await showHUD("Bob started");
  }
};
