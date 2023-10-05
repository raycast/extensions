import { showToast, Toast } from "@raycast/api";
import { launchHookmark } from "./hookmark";

export async function showHookmarkNotOpenToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Hookmark is not running",
    primaryAction: {
      title: "Launch Hookmark and retry to call Search Hookmark command",
      onAction: (toast) => {        
        launchHookmark();
      },
    },
  };
  await showToast(options);
}
