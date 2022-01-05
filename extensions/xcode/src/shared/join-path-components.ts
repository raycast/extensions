import * as Path from "path";

/**
 * Join path components to a string
 * @param pathComponents The path components
 */
export function joinPathComponents(...pathComponents: string[]): string {
  return Path.join(...pathComponents);
}
