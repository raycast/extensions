import fs from "fs";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const appInstalled = () => {
  try {
    return fs.existsSync("/Applications/n8n.app");
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
