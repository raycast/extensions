import { ensureWisprFlowInstalled, openWisprFlow } from "./db";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await openWisprFlow("wispr-flow://open");
}
