import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("toggle-mute", { hudMessage: "Consort · Toggled Mute" });
}
