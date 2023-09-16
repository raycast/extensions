import { showToast, Toast, popToRoot, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { launchHookmark } from "./hookmark";

export async function showHookmarkNotOpenToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Hookmark is not running",
    primaryAction: {
      title: "Launch Hookmark and retry to call Search Hookmark command",
      onAction: (toast) => {
        // exec(`open -ga Hookmark`);
        // execSync(`open -ga Hookmark || open -ga /Applications/Setapp/Hookmark.app`);
        launchHookmark();
        // toast.hide();
        // closeMainWindow();
      },
    },
  };
  await showToast(options);
}
