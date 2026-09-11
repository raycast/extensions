import { triggerCapsoAction } from "./utils";

export default async function Command() {
  await triggerCapsoAction("capso://grab/window", "Capture Window");
}
