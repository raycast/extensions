import { hud, pauseLabel, toolDisplays } from "../lib/displays";
import { isStale, status } from "../lib/helper";

export default async function tool() {
  const now = await status();
  if (isStale(now)) {
    return {
      summary: "An older XDR Boost helper is running; its levels can't be read. Changing the boost replaces it.",
    };
  }
  const paused = pauseLabel(now);
  return { summary: hud(now), ...(paused ? { paused } : {}), displays: toolDisplays(now.displays) };
}
