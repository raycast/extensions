/**
 * Returns the platform-specific refresh shortcut label used in empty states.
 */
export function getRefreshShortcutLabel(): string {
  return process.platform === "win32" ? "Ctrl+R" : "⌘R";
}

/**
 * Returns the platform-specific location shortcut label used in empty states.
 */
export function getEditLocationShortcutLabel(): string {
  return process.platform === "win32" ? "Ctrl+L" : "⌘L";
}

/**
 * Builds a short empty-state hint showing how to trigger the primary refresh action.
 */
export function getRefreshActionHint(action: string): string {
  return `Press ${getRefreshShortcutLabel()} to ${action}`;
}

/**
 * Builds a short empty-state hint showing the current location and edit shortcut.
 */
export function getCurrentLocationHint(location: string): string {
  return `Current location: ${location}. Use ${getEditLocationShortcutLabel()} to change it.`;
}
