import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureAreaAndAnnotate", 28, "Capture Area & Annotate");
}
