import { closeMainWindow, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { promisify } from "util";
import { exec as cExec } from "child_process";
import { checkErrors, checkOpenFortiVpn } from "./utilities/common";
const exec = promisify(cExec);

export default async () => {
  if (await checkOpenFortiVpn()) {
    const stateCmd = 'ps aux | grep "/bin/[o]penfortivpn"';
    try {
      await exec(stateCmd);
      const useSudo: boolean = getPreferenceValues().sudo ?? false;
      const cmd = `${useSudo ? "/usr/bin/sudo /usr/bin/pkill" : "pkill"} openfortivpn || true`;
      const result = await exec(cmd);
      await checkErrors(result.stderr);
      await showHUD("Disconnected from openfortivpn");
    } catch (e) {
      await showHUD("There are no active connections");
    }
    closeMainWindow();
    popToRoot();
  }
};
