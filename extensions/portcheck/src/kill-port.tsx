import { LaunchProps, showHUD } from "@raycast/api";
import { checkMarkdown, parsePort, stoppable } from "./lib/model";
import { check } from "./lib/portcheck";
import { binary, showError } from "./lib/raycast";
import { stopProcess } from "./stop";

export default async function KillPort(props: LaunchProps<{ arguments: Arguments.KillPort }>) {
  const port = parsePort(props.arguments.port);
  if (port === undefined) {
    await showHUD(`"${props.arguments.port}" isn't a port`);
    return;
  }
  try {
    const data = await check(binary(), port);
    const targets = stoppable(port, data);
    if (targets.length === 0) {
      // Free, a container or a hidden owner: say what's there.
      const first = checkMarkdown(port, data).split("\n")[0].replace(/^# /, "");
      await showHUD(first);
      return;
    }
    for (const t of targets) {
      await stopProcess(t);
    }
  } catch (err) {
    await showError(err);
  }
}
