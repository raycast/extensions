import { launchCommand, LaunchType, open } from "@raycast/api";
import { RaycastCommand } from "../types";
import { parseRaycastDeeplink } from "../utils";

export async function executeRaycastCommand(raycastCommand: RaycastCommand): Promise<void> {
  const { deeplink } = raycastCommand;
  const parsed = parseRaycastDeeplink(deeplink);

  if (!parsed) {
    throw new Error(`Invalid deeplink format: ${deeplink}`);
  }

  if (!parsed.isExtensionsFormat) {
    await open(deeplink);
    return;
  }

  if (!parsed.ownerOrAuthorName || !parsed.extensionName || !parsed.name) {
    throw new Error(`Incomplete extension command data: ${deeplink}`);
  }

  await launchCommand({
    ownerOrAuthorName: parsed.ownerOrAuthorName,
    extensionName: parsed.extensionName,
    name: parsed.name,
    type: raycastCommand.type === "user-initiated" ? LaunchType.UserInitiated : LaunchType.Background,
    arguments: raycastCommand.arguments,
  });
}
