import { execFileText } from "./shell";
import { BusyCalInstallation } from "./types";

/**
 * Detects BusyCal builds that do not expose the canonical `open item` scripting command.
 *
 * - Parameters:
 *   - installation: The BusyCal app bundle that Raycast is targeting.
 *   - error: Error surfaced by the AppleScript transport.
 * - Returns: `true` when the installed BusyCal scripting definition does not expose `open item`.
 */
export async function isUnsupportedOpenItemCommandError(
  installation: BusyCalInstallation,
  error: unknown,
): Promise<boolean> {
  return isUnsupportedBusyCalCommandError(installation, error, "open item");
}

/**
 * Detects BusyCal builds that do not expose the natural-language creation command.
 *
 * - Parameters:
 *   - installation: The BusyCal app bundle that Raycast is targeting.
 *   - error: Unknown failure thrown by the AppleScript transport.
 * - Returns: `true` when the installed BusyCal scripting definition does not expose `create natural language item`.
 */
export async function isUnsupportedNaturalLanguageCommandError(
  installation: BusyCalInstallation,
  error: unknown,
): Promise<boolean> {
  return isUnsupportedBusyCalCommandError(
    installation,
    error,
    "create natural language item",
  );
}

/**
 * Classifies one AppleScript failure using both the raw error text and an optional BusyCal scripting definition.
 *
 * Runtime `"doesn't understand"` failures are already definitive. Parser
 * failures only count as missing-command cases when the installed BusyCal
 * scripting definition does not advertise the command, which keeps extension
 * script bugs from being mislabeled as version problems.
 */
export function classifyBusyCalCommandSupportError(
  message: string,
  commandName: string,
  scriptingDefinition?: string,
): boolean {
  if (isDirectMissingBusyCalCommandError(message, commandName)) {
    return true;
  }

  if (!isPotentialBusyCalCommandCompileError(message)) {
    return false;
  }

  if (scriptingDefinition === undefined) {
    return false;
  }

  return !busyCalScriptingDefinitionContainsCommand(
    scriptingDefinition,
    commandName,
  );
}

/**
 * Checks whether one BusyCal scripting definition advertises a specific command name.
 */
export function busyCalScriptingDefinitionContainsCommand(
  scriptingDefinition: string,
  commandName: string,
): boolean {
  const escapedCommandName = commandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const commandPattern = new RegExp(
    `(?:<command\\b[^>]*name|<synonym\\b[^>]*name)="${escapedCommandName}"`,
    "i",
  );
  return commandPattern.test(scriptingDefinition);
}

/**
 * Detects parser failures that can happen before BusyCal handles the script.
 */
function isPotentialBusyCalCommandCompileError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("expected end of line") ||
    normalizedMessage.includes("expected expression")
  );
}

/**
 * Resolves whether the current BusyCal install actually exposes a command.
 */
async function isUnsupportedBusyCalCommandError(
  installation: BusyCalInstallation,
  error: unknown,
  commandName: string,
): Promise<boolean> {
  if (!(error instanceof Error)) {
    return false;
  }

  if (!isPotentialBusyCalCommandCompileError(error.message)) {
    return classifyBusyCalCommandSupportError(error.message, commandName);
  }

  const scriptingDefinition = await execFileText("sdef", [
    installation.appPath,
  ]).catch(() => undefined);
  return classifyBusyCalCommandSupportError(
    error.message,
    commandName,
    scriptingDefinition,
  );
}

/**
 * Matches the explicit BusyCal runtime capability error shape.
 */
function isDirectMissingBusyCalCommandError(
  message: string,
  commandName: string,
): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes(commandName) &&
    (normalizedMessage.includes("doesn’t understand") ||
      normalizedMessage.includes("doesn't understand"))
  );
}
