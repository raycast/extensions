import { useEffect } from "react";
import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { newDocumentFromClipboard } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    // Get lines of text from the clipboard
    Clipboard.readText().then((text) => {
      const lines = text?.split("\n").reverse();
      const clipboardLines = lines?.map(
        (line: string) => '"' + line.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"'
      );

      // Run script
      Promise.resolve(newDocumentFromClipboard(clipboardLines as string[])).then(() =>
        showHUD("Created New Bike Document").then(() => Promise.resolve(popToRoot()))
      );
    });
  }, []);
}
