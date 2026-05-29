import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("capture", "Capture Area");
}
