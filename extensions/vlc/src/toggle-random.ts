import { getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VLC_REMOTE_URL } from "./constants";

export default async function main() {
  const { vlc_password } = getPreferenceValues();
  const url = `${VLC_REMOTE_URL}?command=pl_random`;
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Request failed: ${errorText}`);
    }
    await showHUD("🔀 Toggle Random");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to toggle random" });
  }
}
