import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function BrightnessUp() {
  await closeMainWindow();
  await runTuttiAction("tutti://brightness?delta=5", "Brightness increase requested");
}
