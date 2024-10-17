import { showFailureToast } from "@raycast/utils";
import { VIRTUALIZOR_URL } from "../config";
import { openExtensionPreferences } from "@raycast/api";

export default function generateBaseUrl() {
  try {
    const BASE_URL = new URL(VIRTUALIZOR_URL);
    return BASE_URL;
  } catch (error) {
    showFailureToast(error, {
      title: "Invalid URL Error",
      primaryAction: {
        title: "Open Extension Preferences",
        async onAction() {
          await openExtensionPreferences();
        },
      },
    });
  }
}
