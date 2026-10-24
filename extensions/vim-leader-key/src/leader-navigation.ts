const GROUP_NAVIGATION_GUARD = "•";

export function getChildPath(currentPath: string[], childId: string): string[] {
  return [...currentPath, childId];
}

export function getParentPath(path: string[]): string[] {
  return path.slice(0, -1);
}

export function getSearchSelectionPath(
  resultPath: string[],
  isGroup: boolean,
): string[] {
  return isGroup ? resultPath : getParentPath(resultPath);
}

export function getIdleSearchText(path: string[]): string {
  return path.length > 0 ? GROUP_NAVIGATION_GUARD : "";
}

export function getVisibleSearchText(text: string): string {
  return text.replaceAll(GROUP_NAVIGATION_GUARD, "");
}

export function isClearingGroupNavigationGuard(
  text: string,
  path: string[],
): boolean {
  return path.length > 0 && text === "";
}
