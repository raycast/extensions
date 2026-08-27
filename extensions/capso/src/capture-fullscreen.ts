import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureFullscreen", 19, "Capture Fullscreen");
}
