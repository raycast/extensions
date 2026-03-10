import { open, showToast, Toast } from "@raycast/api";
import { buildWebUiUrl, resolveActiveProfileSelection } from "./profiles";

export default async function Command() {
  try {
    const selection = await resolveActiveProfileSelection();
    await open(buildWebUiUrl(selection.activeProfile));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "Failed to open webchat",
    });
  }
}
