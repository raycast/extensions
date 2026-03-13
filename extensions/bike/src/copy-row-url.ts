import { useEffect } from "react";
import { showHUD, popToRoot } from "@raycast/api";
import checkBikeInstalled from "./index";
import { copySelectedRowURL } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    // Copy row URL to the clipboard
    Promise.resolve(copySelectedRowURL(1)).then(() =>
      showHUD("Copied Row URL To Clipboard!").then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
