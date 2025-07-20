import { showHUD, getPreferenceValues } from "@raycast/api";
import { VLC_REMOTE_URL } from "./constants";

interface SetVolumeArguments {
  arguments: {
    percentage: string;
  };
}

export default async function main(input: SetVolumeArguments) {
  const percentageStr = input?.arguments?.percentage;
  const percentage = Number(percentageStr);
  if (isNaN(percentage) || percentage < 0 || percentage > 125) {
    await showHUD(`Please enter a value between 0 and 125 (got: '${percentageStr}')`);
    return;
  }
  const { vlc_password } = getPreferenceValues();
  const volume = Math.round((percentage / 100) * 256);
  const url = `${VLC_REMOTE_URL}?command=volume&val=${volume}`;
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error("Request failed");
    await showHUD(`🔊 Volume set to ${percentage}%`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await showHUD(`Failed to set volume: ${error}`);
  }
}
