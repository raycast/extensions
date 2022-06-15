import * as fs from "fs";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const betterZipInstalled = () => {
  try {
    const appPath = "/Applications/BetterZip.app";
    return fs.existsSync(appPath);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
