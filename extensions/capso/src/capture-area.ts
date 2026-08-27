import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureArea", 18, "Capture Area");
}
