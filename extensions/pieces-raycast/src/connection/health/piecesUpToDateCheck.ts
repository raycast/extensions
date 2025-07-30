import * as semver from "semver";
import ConnectorSingleton from "../ConnectorSingleton";
import { showToast, Toast } from "@raycast/api";
import Notifications from "../../ui/Notifications";
import { UpdatingStatusEnum } from "@pieces.app/pieces-os-client";
import { pollForConnection } from "./piecesHealthCheck";
import sleep from "../../utils/sleep";
import BrowserUrl from "../../utils/BrowserUrl";
import { PIECES_URLS, PIECES_CONFIG } from "../../utils/constants";

const MIN_VERSION = PIECES_CONFIG.MIN_VERSION;
const MAX_VERSION = PIECES_CONFIG.MAX_VERSION;

/**
 * Checks if the Pieces version is up to date and handles necessary updates.
 *
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating if the Pieces version is up to date.
 */
export default async function piecesUpToDateCheck(): Promise<boolean> {
  const version = await ConnectorSingleton.getInstance()
    .wellKnownApi.getWellKnownVersion()
    .catch(() => null);

  if (!version) return false;
  if (version.includes("debug") || version.includes("staging")) return true;

  const piecesNeedsUpdated = semver.lt(version, MIN_VERSION);
  const extensionNeedsUpdated = semver.gte(version, MAX_VERSION);

  if (!piecesNeedsUpdated && !extensionNeedsUpdated) return true;

  if (extensionNeedsUpdated) {
    await Notifications.getInstance().errorToast(
      "Your Pieces Raycast Extension needs to be updated, please contact support.",
    );
    return false;
  }

  const canAutoUpdate = semver.gte(version, "9.0.3");

  if (!canAutoUpdate) {
    await Notifications.getInstance().errorToast(
      "Please update your PiecesOS version to at least " + MIN_VERSION,
    );
    return false;
  } else {
    return updatePieces();
  }
}

/**
 * Asynchronously checks for PiecesOS updates and handles the update process.
 * Displays a toast notification during the update check and handles different update statuses.
 *
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the update was successful.
 */
async function updatePieces(): Promise<boolean> {
  const toast = await showToast({
    title: "Checking for PiecesOS Update",
    style: Toast.Style.Animated,
  });

  return new Promise<boolean>((res) => {
    const intervalId = setInterval(async () => {
      const status = await ConnectorSingleton.getInstance()
        .osApi.osUpdateCheck({ uncheckedOSServerUpdate: {} })
        .catch(() => null);

      toast.title = getStatusText(status?.status);

      if (!isInProgressStatus(status?.status)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Please Contact Support";
        toast.primaryAction = {
          title: "Contact Support",
          onAction() {
            BrowserUrl.open(PIECES_URLS.SUPPORT);
          },
        };
      }

      if (status?.status === UpdatingStatusEnum.ReadyToRestart) {
        clearInterval(intervalId);
        await ConnectorSingleton.getInstance().osApi.osRestart();
        await sleep(500); // avoiding race condition where pieces might still be running
        const running = await pollForConnection(15e3);
        res(running);
      }
    }, 100);

    setTimeout(
      () => {
        clearInterval(intervalId);
        res(false);
      },
      5 * 60 * 1000,
    );
  });
}

/**
 * This converts UpdatingStatusEnum to a more user friendly format
 * @param status the status from the os update check endpoint
 * @returns readable text to represent the status
 */
function getStatusText(status: UpdatingStatusEnum | undefined) {
  switch (status) {
    case UpdatingStatusEnum.Available:
      return "Update detected...";
    case UpdatingStatusEnum.ContactSupport:
      return `Something went wrong. Please contact support at ${PIECES_URLS.SUPPORT}`;
    case UpdatingStatusEnum.Downloading:
      return "Update is downloading...";
    case UpdatingStatusEnum.ReadyToRestart:
      return "Restarting to apply the update...";
    case UpdatingStatusEnum.ReinstallRequired:
      return "You need to reinstall PiecesOS for this feature to work!";
    case UpdatingStatusEnum.Unknown:
      return "Unknown status";
    case UpdatingStatusEnum.UpToDate:
      return "PiecesOS is up to date.";
    case undefined:
      return `Failed to get update status, please contact support at ${PIECES_URLS.SUPPORT}`;
  }
}

/**
 * Checks if the given status is one of the in-progress statuses.
 *
 * @param {UpdatingStatusEnum | undefined} status - The status to check.
 * @returns {boolean} - Returns true if the status is in-progress, otherwise false.
 */
function isInProgressStatus(status: UpdatingStatusEnum | undefined): boolean {
  return (
    [
      UpdatingStatusEnum.Available,
      UpdatingStatusEnum.ReadyToRestart,
      UpdatingStatusEnum.Downloading,
    ] as Array<UpdatingStatusEnum | undefined>
  ).includes(status);
}
