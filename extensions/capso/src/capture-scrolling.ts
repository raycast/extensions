import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureScrolling", 22, "Scrolling Capture");
}
