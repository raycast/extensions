import { useState } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { closeAllButCurrentDocument } from "./scripts";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Run script
    Promise.resolve(closeAllButCurrentDocument()).then(() => showHUD("Closed Other Documents").then(() => popToRoot()));
  }
}
