import { showHUD } from "@raycast/api";
import { callOp, getSnapshot, trackLabel } from "./lib/ipc";

export default async function main() {
  await callOp("next");
  const snap = await getSnapshot();
  await showHUD(`⏭ ${trackLabel(snap.track ?? snap.logical_track)}`);
}
