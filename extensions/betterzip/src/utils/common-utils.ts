import * as fs from "fs";

export const betterZipInstalled = () => {
  try {
    const appPath1 = "/Applications/BetterZip.app";
    const appPath2 = "/Applications/Setapp/BetterZip.app";
    return fs.existsSync(appPath1) || fs.existsSync(appPath2);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
