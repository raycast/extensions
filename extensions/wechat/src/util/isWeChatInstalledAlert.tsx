import { Alert, confirmAlert, open, closeMainWindow } from "@raycast/api";

export const isWeChatInstalledAlertDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "wechat.png" },
    title: "WeChat is not installed",
    message: "WeChat is not installed on your Mac. Please install WeChat to use this command.",
    primaryAction: {
      title: "Get WeChat",
      onAction: () => {
        open("https://www.wechat.com");
      },
    },
  };
  await confirmAlert(options);
  await closeMainWindow();
};
