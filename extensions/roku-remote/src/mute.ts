import { runQuickKey } from "./lib/actions";

export default async function Command() {
  await runQuickKey("VolumeMute", "Mute/unmute");
}
