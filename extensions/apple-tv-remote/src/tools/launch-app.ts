import { withConnection } from "../lib/connection";
import { showErrorToast } from "../lib/errors";
import { launchApp, listApps } from "../lib/companion-extras";
import { resolveAppName, saveCachedApps } from "../lib/deep-links";

type Input = {
  /** App name as the user said it, e.g. "Netflix", "Disney+", "YouTube" */
  app: string;
};

/**
 * Open an app on the Apple TV by name (e.g. Netflix, YouTube, Disney+).
 * Matches against well-known tvOS apps and the apps actually installed on the device.
 */
export default async function launchAppTool(input: Input): Promise<string> {
  try {
    // First try resolving against the built-in KNOWN_APPS list (no connection needed).
    let resolved = resolveAppName(input.app);

    // If unknown, fetch the installed apps from the device and try again.
    if (!resolved) {
      const installed = await withConnection(async (conn) => listApps(conn));
      await saveCachedApps(installed);
      resolved = resolveAppName(input.app, installed);
    }

    if (!resolved) {
      return `Could not find an app named ${input.app} on the Apple TV.`;
    }

    const { bundleId, name } = resolved;
    await withConnection(async (conn) => launchApp(conn, bundleId));
    return `Launched ${name}`;
  } catch (error) {
    await showErrorToast(error);
    throw error;
  }
}
