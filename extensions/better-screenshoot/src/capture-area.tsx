import { runBetterScreenshootAction } from "./utils";

export default async function Command() {
  await runBetterScreenshootAction("capture-area", "Capture area");
}
