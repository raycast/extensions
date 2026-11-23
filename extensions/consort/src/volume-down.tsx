import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("volume-down", { hudMessage: "Consort · Volume Down" });
}
