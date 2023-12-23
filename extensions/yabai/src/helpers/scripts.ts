import { getPreferenceValues } from "@raycast/api";
import { execaCommand } from "execa";
import { userInfo } from "os";

const userEnv = `env USER=${userInfo().username}`;

export const runYabaiCommand = async (command: string) => {
  const { yabaiExecutablePath } = getPreferenceValues<Preferences>();

  return await execaCommand([userEnv, yabaiExecutablePath, command].join(" "));
};
