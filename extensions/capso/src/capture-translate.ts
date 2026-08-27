import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureAndTranslate", 17, "Capture & Translate");
}
