import { openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { MagpieNotFound } from "./errors";

export async function reportMagpieError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof MagpieNotFound) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Magpie not found",
      message,
      primaryAction: {
        title: "Open Preferences",
        onAction: () => {
          openExtensionPreferences();
        },
      },
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Magpie failed",
    message,
  });
}
