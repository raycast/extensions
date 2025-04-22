import { execSync } from "child_process";
import { showToast, Toast, closeMainWindow } from "@raycast/api";

export default async function main() {
  try {
    await closeMainWindow();
    execSync('hs -c "moveWindowRightAnimated()"');
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Is Hammerspoon running?" });
  }
}
