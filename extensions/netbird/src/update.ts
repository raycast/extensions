import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { netbirdUpdate } from "./utils";

export default async function main() {
  let toast: Awaited<ReturnType<typeof showToast>> | undefined;

  try {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating NetBird",
      message: "Checking current version...",
    });

    const { version, updated, serviceRestarted } = await netbirdUpdate(async (phase) => {
      if (!toast) return;
      if (phase === "upgrading") {
        toast.title = "Updating NetBird";
        toast.message = "Updating via Homebrew...";
      } else if (phase === "restarting") {
        toast.title = "Restarting NetBird";
        toast.message = "Applying changes...";
      } else {
        toast.title = "Updating NetBird";
        toast.message = "Checking current version...";
      }
    });

    if (updated) {
      await toast.hide();
      const manualRestartCommand = "sudo netbird service restart";
      await showToast({
        style: Toast.Style.Success,
        title: "NetBird Updated",
        message: serviceRestarted
          ? `Current version ${version}.`
          : `Updated to ${version}, but service restart failed. Restart manually: ${manualRestartCommand}`,
        primaryAction: serviceRestarted
          ? undefined
          : {
              title: "Copy Restart Command",
              onAction: async (t) => {
                await Clipboard.copy(manualRestartCommand);
                t.hide();
              },
            },
      });
    } else {
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "NetBird is up to date",
        message: `Current version ${version}.`,
      });
    }
  } catch (error) {
    await toast?.hide();
    await showFailureToast(error, { title: "Failed to update NetBird" });
  }
}
