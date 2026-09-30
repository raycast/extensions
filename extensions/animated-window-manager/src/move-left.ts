import { execSync } from "child_process";
import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getHsPath } from "./utils/hsPath";

export default async function main() {
  try {
    await closeMainWindow();
    execSync(`${getHsPath()} -c "moveWindowLeftAnimated()"`);
  } catch (error) {
    await showFailureToast(error, { title: "Is Hammerspoon running?" });
  }
}
