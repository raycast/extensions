import { open } from "@raycast/api";
import { WISPR_FLOW_BUNDLE_ID, ensureWisprFlowInstalled } from "./db";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await open("wispr-flow://open", WISPR_FLOW_BUNDLE_ID);
}
