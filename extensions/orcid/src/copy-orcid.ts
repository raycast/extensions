import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getOrcidId } from "./oauth";

export default async function Command() {
  try {
    const orcidId = await getOrcidId();
    await Clipboard.copy(orcidId);
    await showHUD(`Copied ORCID iD: ${orcidId}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy ORCID iD",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
