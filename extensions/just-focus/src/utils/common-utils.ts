import * as fs from "fs";

export const isAppInstalled = (): boolean => {
  try {
    return fs.existsSync("/Applications/JustFocus.app");
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
