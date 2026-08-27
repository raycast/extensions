import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("screenshotHistory", 25, "Screenshot History");
}
