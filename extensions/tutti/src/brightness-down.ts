import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function BrightnessDown() {
  await closeMainWindow();
  await runTuttiAction("tutti://brightness?delta=-5", "Brightness decrease requested");
}
