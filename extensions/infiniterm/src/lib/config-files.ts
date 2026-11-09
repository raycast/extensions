import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { showToast, Toast } from "@raycast/api";
import { openFiles } from "./ift.ts";

// `~/.config/infiniterm`, where the app keeps its files unless INFINITERM_CONFIG_DIR says otherwise
// (a variable Raycast does not see). The files may be symlinks; ift opens them as they are.
export async function openConfigFile(name: "settings.json" | "keybindings.json"): Promise<void> {
  const path = join(homedir(), ".config", "infiniterm", name);
  if (!existsSync(path)) {
    await showToast({ style: Toast.Style.Failure, title: `${name} not found`, message: path });
    return;
  }
  await openFiles([path]);
}
