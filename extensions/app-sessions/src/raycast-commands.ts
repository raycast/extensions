import type { RaycastCommandStep } from "./types.ts";

export interface ParsedRaycastCommand {
  ownerOrAuthorName: string;
  extensionName: string;
  name: string;
}

export function parseRaycastCommandDeeplink(value: string): ParsedRaycastCommand | undefined {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.protocol !== "raycast:" || url.hostname !== "extensions" || parts.length !== 3) return undefined;

    const [ownerOrAuthorName, extensionName, name] = parts;
    return { ownerOrAuthorName, extensionName, name };
  } catch {
    return undefined;
  }
}

export function getRaycastCommandLabel(deeplink: string): string {
  const command = parseRaycastCommandDeeplink(deeplink);
  return command ? `${humanize(command.name)} · ${humanize(command.extensionName)}` : "Invalid Raycast Command";
}

export async function executeRaycastCommandSteps(
  steps: RaycastCommandStep[],
  launch: (command: ParsedRaycastCommand) => Promise<void>,
): Promise<void> {
  for (const step of steps) {
    const command = parseRaycastCommandDeeplink(step.deeplink);
    if (!command) throw new Error(`Invalid Raycast deeplink: ${step.deeplink}`);

    if (step.waitBeforeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, step.waitBeforeMs));
    }

    await launch(command);
  }
}

function humanize(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
