import * as fs from "fs";

export const betterZipInstalled = () => {
  try {
    const appPath = "/Applications/BetterZip.app";
    return fs.existsSync(appPath);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
