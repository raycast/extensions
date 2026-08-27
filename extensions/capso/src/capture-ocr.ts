import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureText", 21, "Capture Text (OCR)");
}
