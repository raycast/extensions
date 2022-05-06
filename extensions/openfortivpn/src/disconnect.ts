import { closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { promisify } from "util";
import { exec as cExec } from "child_process";
import { checkErrors } from "./utilities/common";
const exec = promisify(cExec);

export default async () => {
  const stateCmd = 'ps aux | grep "/bin/[o]penfortivpn"';
  try {
    await exec(stateCmd);
    const cmd = `/usr/bin/sudo /usr/bin/pkill openfortivpn || true`;
    try {
      await exec(cmd);
      await showHUD("Disconnected from openfortivpn");
    } catch (e) {
      if (e instanceof Error) {
        await checkErrors(e);
      }
    }
  } catch (e) {
    await showHUD("There are no active connections");
  }
  closeMainWindow();
  popToRoot();
};
