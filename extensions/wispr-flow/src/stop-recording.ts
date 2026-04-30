import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import { WISPR_FLOW_BUNDLE_ID, ensureWisprFlowInstalled } from "./db";
import { RECORDING_KEY } from "./toggle-recording";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await open("wispr-flow://stop-hands-free", WISPR_FLOW_BUNDLE_ID);
  await LocalStorage.setItem(RECORDING_KEY, false);
  await showToast({ style: Toast.Style.Success, title: "Recording stopped" });
}
