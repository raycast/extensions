import { getApplications, Icon } from "@raycast/api";

/**
 * Bundle id to application path, so a row can show the app's real icon.
 *
 * Resolved from the list of installed applications rather than stored, because
 * a path on disk is exactly the kind of thing this extension promises not to keep.
 */
export async function loadIconPaths(): Promise<Map<string, string>> {
  const applications = await getApplications();
  const paths = new Map<string, string>();
  for (const application of applications) {
    if (application.bundleId) paths.set(application.bundleId.toLowerCase(), application.path);
  }
  return paths;
}

export function iconFor(key: string, paths: Map<string, string> | undefined) {
  const path = paths?.get(key.toLowerCase());
  // An uninstalled app, or a row keyed by name because it had no bundle id.
  return path ? { fileIcon: path } : Icon.AppWindow;
}
