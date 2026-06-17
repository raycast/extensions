import { closeMainWindow, environment, showHUD, getPreferenceValues } from "@raycast/api";
import { spawnSync, execSync } from "child_process";
import fs from "fs";

interface Preferences {
  isShowHUD: boolean;
}

export default async function send(type: string) {
  // https://raycastcommunity.slack.com/archives/C02HEMAF2SJ/p1686042687713179
  closeMainWindow({ clearRootSearch: true });
  const binary = `${environment.assetsPath}/media-key`;
  try {
    await fs.promises.access(binary, fs.constants.X_OK);
  } catch {
    await fs.promises.chmod(binary, 0o775);
  }
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.isShowHUD) {
    showHUD(`send Key: ${type}`);
  }
  _exec(binary, type);
}

function _exec(binary: string, type: string) {
  execSync(`${binary} ${type}`);
}
