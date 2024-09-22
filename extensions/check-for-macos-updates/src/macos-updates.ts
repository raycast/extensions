import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default async function main() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for macOS updates...",
  });

  try {
    // Execute the softwareupdate command with the full path
    const { stdout } = await execPromise('/usr/sbin/softwareupdate -l');

    // Check if there are updates in a more specific way
    const updateRegex = /\* Label: (.*)/g;
    const availableUpdates = [...stdout.matchAll(updateRegex)];

    if (availableUpdates.length > 0) {
      // Updates are available
      const updateList = availableUpdates.map((match) => match[1]).join(", ");
      toast.style = Toast.Style.Success;
      toast.title = "Updates are available for your macOS.";
      toast.message = `Available updates: ${updateList}.`;

      // Ask user if they want to install the updates
      const shouldInstall = await confirmAlert({
        title: "Install macOS Updates",
        message: `The following updates are available: ${updateList}. Do you want to install them now?`,
        primaryAction: {
          title: "Install",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (shouldInstall) {
        // User accepted to install the updates
        const installToast = await showToast({
          style: Toast.Style.Animated,
          title: "Installing updates...",
        });

        try {
          await execPromise('/usr/sbin/softwareupdate -ia');
          installToast.style = Toast.Style.Success;
          installToast.title = "Updates installed successfully.";
          installToast.message = "Your macOS updates have been installed.";
        } catch (installError) {
          installToast.style = Toast.Style.Failure;
          installToast.title = "Failed to install updates.";
          if (installError instanceof Error) {
            installToast.message = `Error: ${installError.message}`;
          }
        }
      } else {
        // User declined the installation
        toast.style = Toast.Style.Success;
        toast.title = "Updates are available, but not installed.";
        toast.message = "You can install them later by running '/usr/sbin/softwareupdate -ia' in Terminal.";
      }
    } else if (stdout.toLowerCase().includes("no new software available")) {
      // No updates available
      toast.style = Toast.Style.Success;
      toast.title = "Your macOS is up to date.";
    } else {
      // Handle unexpected output
      toast.style = Toast.Style.Failure;
      toast.title = "Unexpected result during update check.";
      toast.message = "Please review the output manually in Terminal.";
    }
  } catch (err) {
    // Handle errors and display in the toast
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to check for updates.";
    if (err instanceof Error) {
      toast.message = `Error: ${err.message}`;
    }
  }
}