import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("swap", { hudMessage: "Consort · Swapped Left & Right" });
}
