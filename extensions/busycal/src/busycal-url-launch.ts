/**
 * Returns the `open` arguments used for BusyCal custom URLs.
 *
 * - Parameters:
 *   - appPath: Absolute path to the BusyCal app bundle when one has been resolved.
 *   - url: BusyCal custom URL to open.
 * - Returns: The `open` command arguments that target BusyCal explicitly when possible.
 */
export function busyCalURLLaunchArguments(
  appPath: string,
  url: string,
): string[] {
  if (appPath.trim().length > 0) {
    return ["-a", appPath, url];
  }

  return [url];
}
