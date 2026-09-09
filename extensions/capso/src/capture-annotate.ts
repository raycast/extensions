import { triggerCapsoAction } from "./utils";

export default async function Command() {
  await triggerCapsoAction("capso://grab/annotate", "Capture Area & Annotate");
}
