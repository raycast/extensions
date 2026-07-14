import {
  Clipboard,
  showHUD,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { fetchIPData } from "./utils/api";
import { Preferences } from "./types";

export default async function CopyMyIP() {
  const { apiKey, plan } = getPreferenceValues<Preferences>();
  try {
    const data = await fetchIPData("", apiKey, plan);
    await Clipboard.copy(data.ip);
    await showHUD(
      `Copied: ${data.ip} · ${data.location.city}, ${data.location.country_name}`,
    );
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get your IP",
    });
  }
}
