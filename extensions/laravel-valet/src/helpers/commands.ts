import { executeCommand, getConfig, handleError } from "../helpers/general";
import { showToast, Toast } from "@raycast/api";
import { Site } from "../types/entities";

interface RunCommandArgs {
  command: string;
  title: string;
  successTitle?: string;
  errorTitle?: string;
  successCallback?: () => void;
}

// Raycast locks up but will queue commands. This prevents those commands from running.
let lock = false;

async function runCommand({ command, title, successTitle, errorTitle, successCallback }: RunCommandArgs) {
  if (lock) return;
  lock = true;
  await showToast({ style: Toast.Style.Animated, title });

  try {
    const output = await executeCommand(command);
    await showToast({
      style: Toast.Style.Success,
      title: successTitle || "Command executed successfully",
    });
    // Optional callback
    await (successCallback?.() ?? Promise.resolve());
    lock = false;
    return output;
  } catch (error) {
    await handleError({ error, title: errorTitle || "Unable to execute command" });
    lock = false;
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

export function unsecureSite(site: Site, successCallback?: () => void) {
  return runCommand({
    command: `valet unsecure ${site.name}`,
    title: `Unsecuring ${site.name}.${getConfig().tld}`,
    successTitle: `${site.name}.${getConfig().tld} will now serve traffic over HTTP`,
    errorTitle: `Unable to unsecure site`,
    successCallback,
  });
}

export function secureSite(site: Site, successCallback?: () => void) {
  return runCommand({
    command: `valet secure ${site.name}`,
    title: `Securing ${site.name}.${getConfig().tld}`,
    successTitle: `${site.name}.${getConfig().tld} has been secured`,
    errorTitle: `Unable to secure site`,
    successCallback,
  });
}
