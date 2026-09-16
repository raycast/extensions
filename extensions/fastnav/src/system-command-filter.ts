import type { FastNavCommand } from "./bridge";

function normalizeKeyPart(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function sharedSystemCommandKey(command: FastNavCommand): string | undefined {
  if (command.source !== "menu") return undefined;

  const normalizedPath = command.menuPath.map(normalizeKeyPart);
  const rootMenu = normalizedPath[0];
  const normalizedTitle = normalizeKeyPart(command.title);

  // macOS exposes the same global Apple menu through every application's
  // accessibility tree. The path after the root distinguishes nested items.
  if (rootMenu === "apple" || rootMenu === "") {
    return ["apple", ...normalizedPath.slice(1), normalizedTitle].join("\0");
  }

  // Services live below each application's own menu, so discard everything
  // before the Services segment when comparing entries across applications.
  const servicesIndex = normalizedPath.indexOf("services");
  if (servicesIndex >= 0) {
    return [
      "services",
      ...normalizedPath.slice(servicesIndex + 1),
      normalizedTitle,
    ].join("\0");
  }

  return undefined;
}

function shouldPreferCommand(
  candidate: FastNavCommand,
  current: FastNavCommand,
  focusedApplicationPID?: number,
): boolean {
  const candidateIsFocused = candidate.pid === focusedApplicationPID;
  const currentIsFocused = current.pid === focusedApplicationPID;
  if (candidateIsFocused !== currentIsFocused) return candidateIsFocused;

  if (candidate.isEnabled !== current.isEnabled) return candidate.isEnabled;
  if (candidate.order !== current.order) return candidate.order < current.order;
  return candidate.appName.localeCompare(current.appName) < 0;
}

/**
 * Keeps one executable representative for macOS commands that are injected
 * into every app. Other same-named actions remain app-specific.
 */
export function collapseSharedSystemCommands(
  commands: FastNavCommand[],
  focusedApplicationPID?: number,
): FastNavCommand[] {
  const collapsed: FastNavCommand[] = [];
  const indexBySharedKey = new Map<string, number>();

  for (const command of commands) {
    const sharedKey = sharedSystemCommandKey(command);
    if (!sharedKey) {
      collapsed.push(command);
      continue;
    }

    const existingIndex = indexBySharedKey.get(sharedKey);
    if (existingIndex === undefined) {
      indexBySharedKey.set(sharedKey, collapsed.length);
      collapsed.push(command);
      continue;
    }

    if (
      shouldPreferCommand(
        command,
        collapsed[existingIndex],
        focusedApplicationPID,
      )
    ) {
      collapsed[existingIndex] = command;
    }
  }

  return collapsed;
}
