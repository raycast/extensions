import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { version } from "../../rpass/application/rpass-client";

const RPASS_URL = "https://github.com/rxtsel/rpass-raycast/releases";

function notInstalledToast(): Toast.Options {
  return {
    style: Toast.Style.Failure,
    title: "rpass is not installed.",
    message: "Download it from GitHub Releases.",
    primaryAction: {
      title: "Open Extension Preferences",
      onAction: (toast) => {
        openExtensionPreferences();
        toast.hide();
      },
    },
    secondaryAction: {
      title: "Go to rpass Releases",
      onAction: (toast) => {
        open(RPASS_URL);
        toast.hide();
      },
    },
  };
}

export default async function checkInstall(): Promise<void> {
  try {
    await version();
  } catch {
    showToast(notInstalledToast());
  }
}
