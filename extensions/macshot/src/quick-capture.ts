import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("quick-capture", "Quick Capture");
}
