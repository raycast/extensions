import { triggerCapsoAction } from "./utils";

export default async function Command() {
  await triggerCapsoAction("capso://grab/last-area", "Capture Previous Area");
}
