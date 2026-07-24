import { runBetterScreenshootAction } from "./utils";

export default async function Command() {
  await runBetterScreenshootAction("capture-window", "Capture window");
}
