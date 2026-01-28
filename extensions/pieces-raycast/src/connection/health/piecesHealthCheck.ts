import { getPreferenceValues } from "@raycast/api";
import ConnectorSingleton from "../ConnectorSingleton";
import ContextService from "../Context";
import piecesInstalledCheck from "./piecesInstalledCheck";
import piecesUpToDateCheck from "./piecesUpToDateCheck";
import { CapabilitiesEnum } from "@pieces.app/pieces-os-client";

/**
 * This will check a few things:
 * - is pieces installed
 * - is pieces running
 * - is pieces at least updated to the minimum required version
 * - does the application need to be updated to represent the users's preferences
 * - this will prompt the user to install PiecesOs if it's not installed, return false if they reject the installation
 * - this will automatically update PiecesOs if it is not at least the minimum required version
 * @returns a boolean on whether or not the health check succeeded
 */
export default async function piecesHealthCheck(): Promise<boolean> {
  const runningAndInstalled = await piecesInstalledCheck();
  if (!runningAndInstalled) return false;

  const updated = await piecesUpToDateCheck();

  if (updated) {
    const preferences = getPreferenceValues<Preferences>();
    ContextService.getInstance()
      .getApplication()
      .then((application) => {
        if (
          application &&
          application?.capabilities?.toLowerCase() !==
            preferences.cloudCapabilities
        ) {
          application.capabilities =
            preferences.cloudCapabilities === "blended"
              ? CapabilitiesEnum.Blended
              : CapabilitiesEnum.Local;
          ConnectorSingleton.getInstance().applicationApi.applicationUpdate({
            application,
          });
        }
      });
  }

  return updated;
}

/**
 * Polls for a connection by repeatedly checking the health status of a well-known API.
 *
 * @param {number} [maxPollingMs=8000] - The maximum duration (in milliseconds) to poll for a connection before timing out.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the connection is established within the polling duration, or `false` if it times out.
 */
export function pollForConnection(maxPollingMs = 10e3): Promise<boolean> {
  return new Promise<boolean>((res) => {
    const intervalId = setInterval(async () => {
      const ok = await ConnectorSingleton.getInstance()
        .wellKnownApi.getWellKnownHealth()
        .catch(() => false);
      if (ok) {
        clearInterval(intervalId);
        res(true);
      }
    }, 100);

    setTimeout(() => {
      res(false);
      clearInterval(intervalId);
    }, maxPollingMs);
  });
}
