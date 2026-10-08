import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import { WISPR_FLOW_BUNDLE_ID, ensureWisprFlowInstalled } from "./db";

export const RECORDING_KEY = "isRecording";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;

  const isRecording =
    (await LocalStorage.getItem<boolean>(RECORDING_KEY)) ?? false;

  if (isRecording) {
    await open("wispr-flow://stop-hands-free", WISPR_FLOW_BUNDLE_ID);
    await showToast({ style: Toast.Style.Success, title: "Recording stopped" });
  } else {
    await open("wispr-flow://start-hands-free", WISPR_FLOW_BUNDLE_ID);
    await showToast({ style: Toast.Style.Success, title: "Recording started" });
  }

  await LocalStorage.setItem(RECORDING_KEY, !isRecording);
}
