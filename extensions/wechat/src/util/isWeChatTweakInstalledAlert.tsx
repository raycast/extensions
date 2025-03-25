import { Alert, confirmAlert, open, closeMainWindow } from "@raycast/api";

export const isWeChatTweakInstalledAlertDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "wechat.png" },
    title: "WeChatTweak is not installed",
    message: "WeChatTweak is not installed on your Mac. Please install WeChatTweak to use this command.",
    primaryAction: {
      title: "Get WeChatTweak",
      onAction: () => {
        open("https://github.com/Sunnyyoung/WeChatTweak-macOS");
      },
    },
  };
  await confirmAlert(options);
  await closeMainWindow();
};
