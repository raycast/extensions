import { showHUD, launchCommand, LaunchType, Clipboard } from "@raycast/api";
import * as fs from "fs";
import * as os from "os";
import path from "path";

export default async function Command() {
  const homeDir = os.homedir();
  const sshKeyRootDir = path.join(homeDir, ".ssh");
  const publicKeys = fs.readdirSync(sshKeyRootDir).filter((file) => file.endsWith(".pub"));

  if (publicKeys.length === 0) {
    await showHUD("❌ No ssh keys found");
  } else if (publicKeys.length === 1) {
    await Clipboard.copy(fs.readFileSync(path.join(sshKeyRootDir, publicKeys[0]), "utf8"));
    await showHUD("✅ Copied ssh key to clipboard");
  } else {
    await launchCommand({ name: "list", type: LaunchType.UserInitiated });
    await showHUD("More than one ssh key found. Opening list...");
  }

  return;
}
