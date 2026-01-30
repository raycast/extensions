import { open, showToast, Toast } from "@raycast/api";
import { getOrcidId, getAuthBaseUrl } from "./oauth";

export default async function Command() {
  try {
    const orcidId = await getOrcidId();
    const url = `${getAuthBaseUrl()}/${orcidId}`;
    await open(url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open profile",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
