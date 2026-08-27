import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureAllInOne", 29, "All-in-One");
}
