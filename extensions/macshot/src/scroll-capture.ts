import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("scroll-capture", "Scroll Capture");
}
