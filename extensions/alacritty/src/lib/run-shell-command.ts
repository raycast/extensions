import { access, constants } from "fs/promises";
import { getAlacrittyPreferences } from "../utils/get-alacritty-preferences";
import { spawnAlacritty } from "./spawn-alacritty";

export const runShellCommand = async (command: string) => {
  const { shellPath } = getAlacrittyPreferences();
  try {
    await access(shellPath, constants.X_OK);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes("ENOENT")) {
        throw new Error(`Shell not found at path: ${shellPath}`);
      }
      if (e.message.includes("EACCES")) {
        throw new Error(`Shell not executable at path: ${shellPath}`);
      }
    }

    throw e;
  }

  return await spawnAlacritty(["--command", shellPath, "-c", command]);
};
