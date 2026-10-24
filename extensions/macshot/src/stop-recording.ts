import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("stop-recording", "Stop Recording");
}
