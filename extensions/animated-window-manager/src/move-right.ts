import { execSync } from "child_process";
import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    await closeMainWindow();
    execSync('hs -c "moveWindowRightAnimated()"');
  } catch (error) {
    await showFailureToast(error, { title: "Is Hammerspoon running?" });
  }
}
