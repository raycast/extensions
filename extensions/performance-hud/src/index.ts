import { showHUD } from "@raycast/api";
import { exec as Exec } from "child_process";
import { exit } from "process";
import { promisify } from "util";

const HUD_FLAG = "MTL_HUD_ENABLED";
const LAUNCHCTL_BINARY = "/bin/launchctl";

const exec = promisify(Exec);

export default async function main() {
  let isHUDEnabled = false;

  await exec(`"${LAUNCHCTL_BINARY}" getenv ${HUD_FLAG}`)
    .then(({ stdout }) => {
      isHUDEnabled = stdout.trim() === "1";
    })
    .catch(async (error) => {
      await showHUD(`Error retrieving performance HUD state: ${error}`);
      exit(-1);
    });

  await exec(`"${LAUNCHCTL_BINARY}" setenv ${HUD_FLAG} ${isHUDEnabled ? "0" : "1"}`)
    .then(async (_) => {
      await showHUD(`Performance HUD toggled ${isHUDEnabled ? "OFF" : "ON"}`);
    })
    .catch(async (error) => {
      await showHUD(`Error toggling performance HUD: ${error}`);
      exit(-1);
    });
}
