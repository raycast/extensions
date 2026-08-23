import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function VolumeUp() {
  await closeMainWindow();
  await runTuttiAction("tutti://volume?delta=5", "Volume up");
}
