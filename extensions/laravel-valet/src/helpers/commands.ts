import { executeCommand, handleError } from "../helpers/general";
import { showToast, Toast } from "@raycast/api";

interface RunCommandArgs {
  command: string;
  title: string;
  successTitle?: string;
  errorTitle?: string;
}
async function runCommand({ command, title, successTitle, errorTitle }: RunCommandArgs) {
  await showToast({ style: Toast.Style.Animated, title });

  try {
    const output = await executeCommand(command);
    await showToast({
      style: Toast.Style.Success,
      title: successTitle || "Command executed successfully",
    });
    return output;
  } catch (error) {
    await handleError({ error, title: errorTitle || "Unable to execute command" });
  }
}

export function restart() {
  return runCommand({
    command: `valet restart`,
    title: `Restarting Valet`,
    successTitle: `Valet has been restarted`,
    errorTitle: `Unable to restart Valet`,
  });
}

export function start() {
  return runCommand({
    command: `valet start`,
    title: `Starting Valet`,
    successTitle: `Valet has been started`,
    errorTitle: `Unable to start Valet`,
  });
}

export function stop() {
  return runCommand({
    command: `valet stop`,
    title: `Stopping Valet`,
    successTitle: `Valet has been stopped`,
    errorTitle: `Unable to stop Valet`,
  });
}
