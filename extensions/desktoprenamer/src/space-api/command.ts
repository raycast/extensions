import { parseSpaceAPICommand } from "./script";
import { communicationMethod, handleDesktopRenamerError, requireDesktopRenamerInstalled } from "./runtime";
import { runDesktopRenamerMethod, runDesktopRenamerScript } from "./transport";

export async function runDesktopRenamerCommand(command: string, errorMessage = "Is DesktopRenamer running?") {
  try {
    await requireDesktopRenamerInstalled();
  } catch (error) {
    await handleDesktopRenamerError(error, errorMessage);
    throw error;
  }

  const method = communicationMethod();
  if (method !== "applescript") {
    const apiCommand = parseSpaceAPICommand(command);
    if (apiCommand) {
      const result = await runDesktopRenamerMethod(apiCommand.name, apiCommand.arguments, errorMessage);
      return typeof result === "string" ? result : JSON.stringify(result);
    }
  }
  return await runDesktopRenamerScript(`tell application "DesktopRenamer" to ${command}`, errorMessage);
}
