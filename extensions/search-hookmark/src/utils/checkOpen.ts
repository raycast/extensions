import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export async function showHookmarkNotOpenToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Hookmark is not running",
    primaryAction: {
      title: "Launch Hookmark",
      onAction: (toast) => {
        exec(`open -ga Hookmark`);
        toast.hide();
        closeMainWindow();
      },
    },
  };
  await showToast(options);
}
