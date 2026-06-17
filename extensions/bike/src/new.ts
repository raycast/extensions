import { useEffect } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { createNewDocument } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    Promise.resolve(createNewDocument()).then(() =>
      showHUD("Created New Bike Document").then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
