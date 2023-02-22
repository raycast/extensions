import { BARTENDER_DISPLAY_NAME } from "./constants";
import { NoViewCommand } from "./utils";

export default async function Command() {
  await NoViewCommand(`Toggling ${BARTENDER_DISPLAY_NAME}`, `✅ Toggled ${BARTENDER_DISPLAY_NAME}`, "toggle bartender");
}
