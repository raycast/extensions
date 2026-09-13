import { showHUD } from "@raycast/api";
import { callOp } from "./lib/ipc";

export default async function main() {
  await callOp("volume.adjust", { value: 3 });
  await showHUD("🔊 Volume +3 dB");
}
