import { showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { fetchUV, uvLevel } from "./uv";

export default async function Command() {
  try {
    const { uv, max, place, updatedAt } = await fetchUV();
    const time = new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    // Shown next to the command in root search until the next run; no background refresh.
    await updateCommandMetadata({ subtitle: `☀️ UV ${uv} · ${uvLevel(uv)} · ${time}` });
    await showHUD(`☀️ UV ${uv} · ${uvLevel(uv)} in ${place} · Peak today ${max}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't get UV index",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
