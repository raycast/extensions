import * as fs from "fs"

export const isWeChatInstalled = (): boolean => {
  try {
    return fs.existsSync("/Applications/WeChat.app" || "/Applications/微信.app")
  } catch (e) {
    console.error(String(e))
    return false
  }
}
