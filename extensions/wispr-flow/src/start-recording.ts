import { showToast, Toast } from "@raycast/api";
import { ensureWisprFlowInstalled, openWisprFlow } from "./db";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await openWisprFlow("wispr-flow://start-hands-free");
  await showToast({ style: Toast.Style.Success, title: "Recording started" });
}
