import { triggerCapsoAction } from "./utils";

export default async function Command() {
  await triggerCapsoAction("capso://grab/clipboard", "Capture Area to Clipboard");
}
