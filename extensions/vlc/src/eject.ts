import { getPreferenceValues, showHUD } from "@raycast/api";
import { VLC_REMOTE_URL } from "./constants";

export default async function main() {
  const { vlc_password } = getPreferenceValues();
  const url = `${VLC_REMOTE_URL}?command=eject`;
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error("Request failed");
    await showHUD("⏏️ Eject");
  } catch (e) {
    await showHUD("Failed to eject");
  }
}
