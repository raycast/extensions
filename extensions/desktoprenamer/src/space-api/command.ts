import { runAppleScript } from "@raycast/utils";
import { SpaceAPIProtocolError } from "./contract";
import { isReadSpaceAPIMethod } from "./codec";
import { runLegacySpaceAPICommandWithCompatibility } from "./legacy";
import { parseSpaceAPICommand } from "./script";
import { handleDesktopRenamerError, communicationMethod, requireDesktopRenamerInstalled } from "./runtime";
import { normalizeMethodArguments, runDesktopRenamerScript, stringifyLegacyParameters } from "./transport";

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
    try {
      if (apiCommand) {
        // This function is the legacy raw-command compatibility helper. Keep
        // its delimiter/string result shape stable; typed callers should use
        // runDesktopRenamerMethod instead.
        const parameters = normalizeMethodArguments(apiCommand.name, apiCommand.arguments);
        return await runLegacySpaceAPICommandWithCompatibility(apiCommand.name, stringifyLegacyParameters(parameters));
      }
    } catch (error) {
      if (
        method === "spaceapi" ||
        !apiCommand ||
        !isReadSpaceAPIMethod(apiCommand.name) ||
        !(error instanceof SpaceAPIProtocolError && error.canFallback)
      ) {
        await handleDesktopRenamerError(error, errorMessage);
        throw error;
      }
      try {
        return await runAppleScript(`tell application "DesktopRenamer" to ${command}`);
      } catch (scriptError) {
        await handleDesktopRenamerError(scriptError, errorMessage);
        throw scriptError;
      }
    }
  }
  return await runDesktopRenamerScript(`tell application "DesktopRenamer" to ${command}`, errorMessage);
}
