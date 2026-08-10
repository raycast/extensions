import { useEffect } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { minimizeBikeWindows } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    Promise.resolve(minimizeBikeWindows()).then(() =>
      showHUD("Minimized Bike").then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
