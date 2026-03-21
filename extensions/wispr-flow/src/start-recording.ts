import { open, showToast, Toast } from "@raycast/api";
import { WISPR_FLOW_BUNDLE_ID, ensureWisprFlowInstalled } from "./db";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await open("wispr-flow://start-hands-free", WISPR_FLOW_BUNDLE_ID);
  await showToast({ style: Toast.Style.Success, title: "Recording started" });
}
