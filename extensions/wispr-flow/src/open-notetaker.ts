import { ensureWisprFlowInstalled, openWisprFlow } from "./db";
import { NOTETAKER_URL } from "./notetaker";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  await openWisprFlow(NOTETAKER_URL);
}
