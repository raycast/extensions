import { getAlacrittyPreferences } from "../utils/get-alacritty-preferences";
import { spawnAlacritty } from "./spawn-alacritty";

export const runShellCommand = async (command: string) => {
  const { shellPath } = getAlacrittyPreferences();
  return await spawnAlacritty(["--command", shellPath, "-c", command]);
};
