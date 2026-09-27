import { showHUD } from "@raycast/api";
import { callOp } from "./lib/ipc";

export default async function main() {
  await callOp("stop");
  await showHUD("⏹ Stopped");
}
