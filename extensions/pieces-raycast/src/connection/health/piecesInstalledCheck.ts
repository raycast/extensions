import * as os from "os";
import { confirmAlert, showToast, Toast, open } from "@raycast/api";
import launchRuntime from "../../utils/launchRuntime";
import ConnectorSingleton from "../ConnectorSingleton";
import { exec } from "child_process";
import { pollForConnection } from "./piecesHealthCheck";

/**
 * Checks the health of Pieces OS and attempts to install it if necessary.
 *
 * This function performs the following steps:
 * 1. Shows a toast notification indicating that the health check is in progress.
 * 2. Checks the health of Pieces OS using the well-known API.
 * 3. If Pieces OS is healthy, hides the toast and returns true.
 * 4. If Pieces OS is not healthy, attempts to launch Pieces OS.
 * 5. If launching is successful, polls for a connection and hides the toast if connected.
 * 6. If launching fails, prompts the user to install Pieces OS.
 * 7. If the user agrees to install, downloads and installs Pieces OS.
 * 8. Polls for a connection for up to 10 minutes.
 * 9. Hides the toast and returns the result of the installation.
 *
 * @returns {Promise<boolean>} - A promise that resolves to true if Pieces OS is installed and connected successfully, otherwise false.
 */
export default async function piecesInstalledCheck() {
  const toast = await showToast({
    title: "Checking for Pieces OS health",
    primaryAction: {
      title: "Contact Support",
      onAction() {
        open("https://docs.pieces.app/support");
      },
    },
    style: Toast.Style.Animated,
  });

  const ok = await ConnectorSingleton.getInstance()
    .wellKnownApi.getWellKnownHealth()
    .catch(() => false);
  if (ok) {
    toast.hide();
    return true;
  }

  toast.title = "Attempting to launch Pieces OS";
  await launchRuntime();
  const connected = await pollForConnection();

  if (connected) {
    toast.hide();
    return true;
  }

  const shouldInstall = await new Promise<boolean>((res) =>
    requestInstall(res),
  );

  if (!shouldInstall) {
    toast.style = Toast.Style.Failure;
    toast.title = "Cannot perform this action without installing Pieces OS";
    return false;
  }

  toast.title = "Downloading Pieces OS";

  performInstall().then(() => {
    toast.title = "Installing Pieces OS";
  });

  const successfulInstall = await pollForConnection(10 * 60 * 1000); // wait 10 minutes

  toast.hide();

  return successfulInstall;
}

/**
 * Prompts the user with an alert to confirm the installation of Pieces OS.
 *
 * @param res - A callback function that resolves with a boolean value indicating the user's choice.
 *              - `true` if the user chooses to install.
 *              - `false` if the user cancels the installation.
 */
async function requestInstall(res: (val: boolean) => void) {
  await confirmAlert({
    title:
      "In order to use the Pieces Raycast extension you must have Pieces OS installed, would you like to install it?",
    primaryAction: {
      title: "Install",
      onAction() {
        res(true);
      },
    },
    dismissAction: {
      title: "Cancel",
      onAction() {
        res(false);
      },
    },
    icon: { source: "piecesVector.png" },
  });
}

/**
 * Downloads and installs the Pieces OS package based on the system architecture.
 *
 * This function constructs a download URL for the Pieces OS package, taking into account
 * whether the system architecture is ARM64 or not. It then downloads the package to a
 * temporary path and attempts to open it for installation. If the download fails, an
 * error message is printed.
 *
 * @returns {Promise<void>} A promise that resolves when the installation script completes.
 */
function performInstall() {
  const arch = os.arch();
  const script = `PKG_URL="https://builds.pieces.app/stages/production/macos_packaging/pkg-pos-launch-only${arch === "arm64" ? "-arm64" : ""}/download"
TMP_PKG_PATH="/tmp/Pieces-OS-Launch.pkg"
curl -L "$PKG_URL" -o "$TMP_PKG_PATH"
if [ -f "$TMP_PKG_PATH" ]; then
    open "$TMP_PKG_PATH"
else
    echo "Failed to download and install Pieces OS."
fi`;
  return new Promise<void>((res) => {
    exec(script, () => {
      res();
    });
  });
}
