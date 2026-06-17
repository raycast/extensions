import { useEffect } from "react";
import { showHUD, popToRoot } from "@raycast/api";
import checkBikeInstalled from "./index";
import { copyDocumentURL } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    // Copy the URL to the clipboard
    Promise.resolve(copyDocumentURL(1)).then(() =>
      showHUD("Copied Document URL To Clipboard!").then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
