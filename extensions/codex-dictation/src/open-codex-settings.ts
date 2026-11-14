import { open, showToast, Toast } from "@raycast/api";
import { CODEX_APP_URL, CODEX_SETTINGS_URL } from "./codex-paths";

export default async function Command() {
  try {
    await open(CODEX_SETTINGS_URL);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Codex Settings",
      message: "Install or open Codex first, then try again.",
      primaryAction: {
        title: "Install Codex",
        onAction: async () => {
          await open(CODEX_APP_URL);
        },
      },
    });
  }
}
