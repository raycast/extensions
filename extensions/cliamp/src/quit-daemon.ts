import { showHUD } from "@raycast/api";
import { daemonPid } from "./lib/ipc";

export default async function main() {
  const pid = daemonPid();
  if (!pid) {
    await showHUD("cliamp is not running");
    return;
  }
  process.kill(pid, "SIGTERM");
  await showHUD("cliamp daemon stopped");
}
