import { showToast, Toast, showHUD } from "@raycast/api";
import { getLastPlayed, listPatterns } from "./lib/storage";
import { renderAndPlay, getTrackPid, saveQuickPlayState, stopQuickPlayFromFile } from "./lib/strudel";

export default async function QuickPlay() {
  const stopped = stopQuickPlayFromFile();
  if (stopped) {
    await showHUD("⏹ Stopped");
    return;
  }

  const lastId = await getLastPlayed();
  const patterns = await listPatterns();
  const pattern = lastId ? patterns.find((p) => p.id === lastId) : patterns[0];

  if (!pattern) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No patterns saved",
      message: "Save one from Evaluate first",
    });
    return;
  }

  try {
    await showToast({ style: Toast.Style.Animated, title: `Playing ${pattern.name}...` });
    await renderAndPlay(pattern.code, {}, pattern.id, true);
    const pid = getTrackPid(pattern.id);
    if (pid) saveQuickPlayState(pattern.id, pid);
    await showHUD(`▶ ${pattern.name}`);
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Render failed", message: String(e) });
  }
}
