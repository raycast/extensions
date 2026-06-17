import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execaCommand } from "execa";
import { userInfo } from "os";
import { cpus } from "os";
import fs from "fs";

const userEnv = `env USER=${userInfo().username}`;

export const runYabaiCommand = async (command: string, opt?: { shell?: boolean }) => {
  const preferences = getPreferenceValues<Preferences>();
  const yabaiPath: string =
    preferences.yabaiPath && preferences.yabaiPath.length > 0
      ? preferences.yabaiPath
      : cpus()[0].model.includes("Apple")
        ? "/opt/homebrew/bin/yabai"
        : "/usr/local/bin/yabai";

  if (!fs.existsSync(yabaiPath)) {
    await showToast(Toast.Style.Failure, "Yabai executable not found", `Is yabai installed at ${yabaiPath}?`);
    return { stdout: "", stderr: "Yabai executable not found" };
  }

  return await execaCommand([userEnv, yabaiPath, command].join(" "), opt);
};
