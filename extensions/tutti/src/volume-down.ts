import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function VolumeDown() {
  await closeMainWindow();
  await runTuttiAction("tutti://volume?delta=-5", "Volume down");
}
