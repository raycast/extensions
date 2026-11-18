import { LocalStorage, showToast, Toast } from "@raycast/api";
import { ensureWisprFlowInstalled, openWisprFlow } from "./db";
import { RECORDING_KEY } from "./toggle-recording";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await openWisprFlow("wispr-flow://stop-hands-free");
  await LocalStorage.setItem(RECORDING_KEY, false);
  await showToast({ style: Toast.Style.Success, title: "Recording stopped" });
}
