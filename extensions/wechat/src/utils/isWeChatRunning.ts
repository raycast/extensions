import * as fs from "fs";

import { Alert, closeMainWindow, confirmAlert, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const isWeChatRunning = async () => {
  const options: Alert.Options = {
    icon: { source: "wechat.png" },
    title: "WeChat is not running",
    message: "WeChat is not running on your Mac. Please open WeChat to use this command.",
    primaryAction: {
      title: "Open WeChat",
      onAction: () => {
        try {
          // determine which path to use
          const foundWechatPath = ["/Applications/WeChat.app", "/Applications/微信.app"].find(fs.existsSync);

          if (foundWechatPath) {
            open(foundWechatPath);
          } else {
            showFailureToast("WeChat application not found");
          }
        } catch {
          showFailureToast("Error opening WeChat");
        }
      },
    },
  };
  await confirmAlert(options);
  await closeMainWindow();
};
