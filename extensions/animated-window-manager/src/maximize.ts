import { execSync } from "child_process";
import { closeMainWindow, showToast, Toast } from "@raycast/api";

export default async function main() {
  try {
    await closeMainWindow();
    execSync('hs -c "maximizeWindowAnimated()"');
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Is Hammerspoon running?" });
  }
}
