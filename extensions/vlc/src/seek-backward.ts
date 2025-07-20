import { getPreferenceValues, showHUD } from "@raycast/api";

export default async function main() {
  const { vlc_password } = getPreferenceValues();
  const url = "http://localhost:8080/requests/status.json?command=seek&val=-10";
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error("Request failed");
    await showHUD("⏪ Seek Backward");
  } catch (e) {
    await showHUD("Failed to seek backward");
  }
}
