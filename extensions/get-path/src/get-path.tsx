import {Clipboard, closeMainWindow, PopToRootType, showHUD} from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {

    await showHUD("I am finding the path for you", { clearRootSearch: false, popToRootType: PopToRootType.Immediate });

  const result = await runAppleScript(`
  tell application "Finder"
    set theSelection to selection
    repeat with oneItem in theSelection
        set thePath to POSIX path of (oneItem as alias)
        return thePath
    end repeat
  end tell`);

  if (result === "") {
    await showHUD("No path found", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await closeMainWindow();
    return;
  }

  const textContent: Clipboard.Content = {
    text: result,
  };
  await Clipboard.copy(textContent);

  await showHUD("The path is copied to clipboard: " + result, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
