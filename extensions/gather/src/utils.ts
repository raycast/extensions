import fs from "fs";

const GATHER_V2 = "/Applications/GatherV2.app";
const GATHER_V1 = "/Applications/Gather.app";

export const GATHER_APP_PATH = fs.existsSync(GATHER_V2) ? GATHER_V2 : GATHER_V1;

export async function gatherInstalled() {
  try {
    return fs.existsSync(GATHER_APP_PATH);
  } catch (e) {
    console.error(String(e));
    return false;
  }
}
