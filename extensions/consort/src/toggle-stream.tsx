import { runConsortAction } from "./lib/consort";

export default async function Command() {
  await runConsortAction("toggle", { hudMessage: "Consort · Toggled Stereo Stream" });
}
