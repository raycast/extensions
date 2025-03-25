import * as fs from "fs";

export const isWeChatTweakInstalled = (): boolean => {
  try {
    return [
      "/usr/local/bin/wechattweak-cli",
      "/usr/local/Cellar/wechattweak-cli",
      "/usr/local/opt/wechattweak-cli",
      "/usr/local/bin/wechattweak-cli",
      "/opt/homebrew/bin/wechattweak-cli",
      "/usr/local/bin/wechattweak-cli",
    ].some(fs.existsSync);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
