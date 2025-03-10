import * as fs from "fs"

import { Alert, confirmAlert, open, closeMainWindow } from "@raycast/api"

export const isWeChatRunning = async () => {
  const options: Alert.Options = {
    icon: { source: "wechat.png" },
    title: "WeChat is not running",
    message:
      "WeChat is not running on your Mac. Please open WeChat to use this command.",
    primaryAction: {
      title: "Open WeChat",
      onAction: () => {
        // determine which path to use
        const weChatPath = fs.existsSync("/Applications/WeChat.app")
          ? "/Applications/WeChat.app"
          : "/Applications/微信.app"

        if (fs.existsSync(weChatPath)) {
          open(weChatPath)
        } else {
          console.error("WeChat application not found.")
        }
      }
    }
  }
  await confirmAlert(options)
  await closeMainWindow()
}
