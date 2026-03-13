import { getPreferenceValues } from "@raycast/api";
import { Shell, isShell } from "../types/shell";

export const getAlacrittyPreferences = () => {
  const { alacrittyPath, shellPath } = getPreferenceValues<ExtensionPreferences>();
  if (alacrittyPath.split("/").pop() !== "alacritty") {
    throw new Error(`Invalid Alacritty path: ${alacrittyPath}`);
  }

  const shell = shellPath.split("/").pop();
  if (!shell || !isShell(shell)) {
    throw new Error(`Invalid shell: ${shell} (use ${Object.values(Shell).join(", ")})`);
  }

  return { alacrittyPath, shellPath, shell };
};
