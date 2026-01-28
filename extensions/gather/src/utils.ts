import fs from "fs";

export async function gatherInstalled() {
  try {
    return fs.existsSync("/Applications/Gather.app");
  } catch (e) {
    console.error(String(e));
    return false;
  }
}
