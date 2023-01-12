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
        open("/Applications/WeChat.app" || "/Applications/微信.app")
      }
    }
  }
  await confirmAlert(options)
  await closeMainWindow()
}
