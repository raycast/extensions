import * as fs from "fs"

export const isWeChatTweakInstalled = (): boolean => {
  try {
    return fs.existsSync(
      "/usr/local/bin/wechattweak-cli" ||
        "/usr/local/Cellar/wechattweak-cli" ||
        "/usr/local/opt/wechattweak-cli" ||
        "/usr/local/bin/wechattweak-cli" ||
        "/opt/homebrew/bin/wechattweak-cli" ||
        "/usr/local/bin/wechattweak-cli"
    )
  } catch (e) {
    console.error(String(e))
    return false
  }
}
