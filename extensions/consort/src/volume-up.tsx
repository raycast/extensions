import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("volume-up", { hudMessage: "Consort · Volume Up" });
}
