import { showHUD, getPreferenceValues } from "@raycast/api";

export default async function main(input: any) {
  const percentageStr = input?.arguments?.percentage;
  const percentage = Number(percentageStr);
  if (isNaN(percentage) || percentage < 0 || percentage > 125) {
    await showHUD(`Please enter a value between 0 and 125 (got: '${percentageStr}')`);
    return;
  }
  const { vlc_password } = getPreferenceValues();
  const volume = Math.round((percentage / 100) * 256);
  const url = `http://localhost:8080/requests/status.json?command=volume&val=${volume}`;
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error("Request failed");
    await showHUD(`🔊 Volume set to ${percentage}%`);
  } catch (e: any) {
    await showHUD(`Failed to set volume: ${e?.message || e}`);
  }
}
