import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adderallBin, INSTALL_HINT } from "./adderall";

const run = promisify(execFile);

export default async function Command() {
  const bin = adderallBin();
  if (!bin) {
    await showHUD(`💊 adderall not found — ${INSTALL_HINT}`);
    return;
  }
  try {
    await run(bin, ["off"]);
    await showHUD("😴 Adderall OFF — normal sleep restored");
  } catch {
    await showHUD("⚠️ Couldn't turn Adderall off");
  }
}
