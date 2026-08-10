import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("record-fullscreen", "Record Full Screen");
}
