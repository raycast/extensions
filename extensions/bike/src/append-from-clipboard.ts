import { useState } from "react";
import { popToRoot, Clipboard, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { appendFromClipboard } from "./scripts";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkBikeInstalled();
  if (error_alert) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Get lines of text from the clipboard
    Clipboard.readText().then((text) => {
      const lines = text?.split("\n");
      const clipboardLines = lines?.map(
        (line: string) => '"' + line.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"'
      );

      // Run script
      Promise.resolve(appendFromClipboard(clipboardLines as string[], 1)).then(() =>
        showHUD("Appended To Current Document").then(() => popToRoot())
      );
    });
  }
}
