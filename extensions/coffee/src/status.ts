import { LaunchProps, updateCommandMetadata } from "@raycast/api";
import { execSync } from "node:child_process";

function isCaffeinateProcessRunning() {
  try {
    execSync("pgrep caffeinate");
    return true;
  } catch {
    return false;
  }
}
export default async function Command(props: LaunchProps) {
  const isCaffeinated = props.launchContext?.caffeinated ?? isCaffeinateProcessRunning();
  const subtitle = isCaffeinated ? "✔ Caffeinated" : "✖ Decaffeinated";

  updateCommandMetadata({ subtitle });
}
