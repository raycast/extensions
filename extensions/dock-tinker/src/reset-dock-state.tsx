import { Alert, confirmAlert, Icon, showHUD } from "@raycast/api";
import { spawnSync } from "child_process";

export default async () => {
  const options: Alert.Options = {
    icon: Icon.ArrowCounterClockwise,
    title: "Reset Dock State",
    message: "Are you sure you want to reset the Dock state? This will remove all customizations.",
    primaryAction: {
      style: Alert.ActionStyle.Destructive,
      title: "Confirm",
      onAction: async () => {
        spawnSync("defaults delete com.apple.dock && killall Dock", { shell: true });
        await showHUD("💻 Dock state has been reset");
      },
    },
  };
  await confirmAlert(options);
};
