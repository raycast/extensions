import { closeMainWindow, confirmAlert, Alert } from "@raycast/api";
import { spawnPlus, execSync } from "#/utils/childProcess";
import { delay } from "#/utils/js";

export async function runCommand(command: string) {
  const PATH = execSync("echo $PATH", { encoding: "utf8", shell: "bash" });
  const child = spawnPlus(command, { env: { ...process.env, PATH } });
  child.on("errorPlus", ({ stderr }) => {
    confirmAlert({
      title: "",
      message: stderr,
      dismissAction: { title: "Error", style: Alert.ActionStyle.Destructive },
      primaryAction: { title: "", style: Alert.ActionStyle.Cancel },
    });
  });
  await closeMainWindow({ clearRootSearch: true });
  await delay(1000);
}
