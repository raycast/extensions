import { Cache, LaunchType, launchCommand, showHUD, type LaunchProps } from "@raycast/api";
import { isRunCommandLaunchContext, type RunInput, type RunViewLaunchContext } from "./lib/launch-context";
import { parsePrompt } from "./lib/placeholders";
import { isRunInFlight } from "./lib/replace";
import { NO_INPUT_MESSAGE, resolveLaunchTarget } from "./lib/run-request";
import { loadCommands } from "./services/command-store";
import { captureInput } from "./services/input";
import { replaceSelection } from "./services/paste";
import { ensureReady } from "./services/preflight";
import { getSettings } from "./services/settings";

const IN_FLIGHT_KEY = "run-command.in-flight";
const IN_FLIGHT_TIMEOUTS_PER_RUN = 2;
const DIRECT_LAUNCH_MESSAGE =
  "This runs commands from hotkeys. In AI Commands, choose Create Quicklink on a command, then give it a hotkey";
const cache = new Cache();

export default async function Command(props: LaunchProps) {
  const commandId = isRunCommandLaunchContext(props.launchContext) ? props.launchContext.commandId : undefined;
  if (commandId === undefined) return showHUD(DIRECT_LAUNCH_MESSAGE);

  let input: RunInput | undefined;
  try {
    input = await captureInput({ allowCopyFallback: true });
  } catch {
    return showHUD(NO_INPUT_MESSAGE);
  }

  const guardMs = getSettings().timeoutMs * IN_FLIGHT_TIMEOUTS_PER_RUN;
  if (isRunInFlight(cache.get(IN_FLIGHT_KEY), Date.now(), guardMs)) return showHUD("Already running");
  cache.set(IN_FLIGHT_KEY, String(Date.now()));

  try {
    const { commands, readOnly } = await loadCommands();
    if (readOnly) return await showHUD("Commands were saved by a newer version of Local AI");
    const target = resolveLaunchTarget(commandId, commands);
    if (target.kind !== "found") return await showHUD("Command was deleted");

    if (!(await ensureReady())) return;
    if (!input) return await showHUD(NO_INPUT_MESSAGE);

    const { command } = target;
    if (command.output === "window" || parsePrompt(command.prompt).arguments.length > 0) {
      const context: RunViewLaunchContext = { commandId: command.id, input };
      return await launchCommand({ name: "run-ai-command", type: LaunchType.UserInitiated, context });
    }
    await replaceSelection(command, input, {});
  } finally {
    cache.remove(IN_FLIGHT_KEY);
  }
}
