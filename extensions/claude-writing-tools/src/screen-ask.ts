import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import type { ChatSeed } from "./components/Chat";
import { showErrorHUD } from "./lib/errors";
import { captureRegion } from "./lib/system";

export default async function Command() {
  await closeMainWindow();
  try {
    const capture = await captureRegion(true);
    if (!capture) return;
    const seed: ChatSeed = {
      attachments: [{ kind: "image", ...capture }],
      placeholder: "Ask about the screenshot… (leave empty for an explanation)",
    };
    await launchCommand({ name: "ask", type: LaunchType.UserInitiated, context: seed });
  } catch (error) {
    await showErrorHUD(error);
  }
}
