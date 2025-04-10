import * as fs from "fs";

export const isWeChatInstalled = (): boolean => {
  try {
    return ["/Applications/WeChat.app", "/Applications/微信.app"].some(fs.existsSync);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
