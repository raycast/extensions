import { launchCommand, LaunchType, open } from "@raycast/api";
import { RaycastCommand } from "../types";
import { parseRaycastDeeplink } from "../utils";
import { ERROR_MESSAGES } from "./constants";

export async function executeRaycastCommand(raycastCommand: RaycastCommand): Promise<void> {
  const { deeplink } = raycastCommand;
  if (typeof deeplink !== "string" || deeplink.trim().length === 0) {
    throw new Error(`${ERROR_MESSAGES.DEEPLINK_INVALID}: ${String(deeplink)}`);
  }

  const parsed = parseRaycastDeeplink(deeplink);

  if (!parsed) {
    throw new Error(`${ERROR_MESSAGES.DEEPLINK_INVALID}: ${deeplink}`);
  }

  if (!parsed.isExtensionsFormat) {
    await open(deeplink);
    return;
  }

  if (!parsed.ownerOrAuthorName || !parsed.extensionName || !parsed.name) {
    throw new Error(`${ERROR_MESSAGES.EXT_COMMAND_INCOMPLETE}: ${deeplink}`);
  }

  const args = raycastCommand.arguments;
  const hasArgs = Boolean(args && typeof args === "object");

  const launchOptions = {
    ownerOrAuthorName: parsed.ownerOrAuthorName,
    extensionName: parsed.extensionName,
    name: parsed.name,
    type: raycastCommand.type === "user-initiated" ? LaunchType.UserInitiated : LaunchType.Background,
    ...(hasArgs ? { arguments: args } : {}),
  };

  try {
    await launchCommand(launchOptions);
  } catch (error) {
    // If a "view" command was launched with Background type, Raycast rejects it.
    // Retry as UserInitiated so the command still executes on schedule.
    if (
      launchOptions.type === LaunchType.Background &&
      error instanceof Error &&
      error.message.includes("cannot launch mode")
    ) {
      await launchCommand({ ...launchOptions, type: LaunchType.UserInitiated });
    } else {
      throw error;
    }
  }
}
