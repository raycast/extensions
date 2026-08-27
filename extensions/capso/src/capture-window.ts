import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureWindow", 20, "Capture Window");
}
