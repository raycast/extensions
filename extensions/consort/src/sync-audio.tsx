import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("calibrate", { hudMessage: "Consort · Syncing Audio…" });
}
