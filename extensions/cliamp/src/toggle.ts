import { showHUD } from "@raycast/api";
import { callOp, getSnapshot, trackLabel } from "./lib/ipc";

export default async function main() {
  await callOp("toggle");
  const snap = await getSnapshot();
  const track = snap.track ?? snap.logical_track;
  await showHUD(snap.state === "playing" ? `▶︎ ${trackLabel(track)}` : "⏸ Paused");
}
