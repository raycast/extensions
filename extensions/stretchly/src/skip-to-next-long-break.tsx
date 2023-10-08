import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import * as util from "util";

const promiseExec = util.promisify(exec);

export default async function main() {
  try {
    await showHUD("Long Break");
    const { stdout, stderr } = await promiseExec("/Applications/Stretchly.app/Contents/MacOS/stretchly long");
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
  } catch (error) {
    await showHUD(`${error}`); // should contain code (exit code) and signal (that caused the termination).
  }
}
