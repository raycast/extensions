import { showHUD } from "@raycast/api";
import { daemonPid, startDaemon } from "./lib/ipc";

export default async function main() {
  const pid = daemonPid();
  if (pid) {
    await showHUD(`cliamp already running (pid ${pid})`);
    return;
  }
  await startDaemon();
  await showHUD("cliamp daemon started");
}
