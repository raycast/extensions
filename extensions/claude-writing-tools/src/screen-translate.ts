import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import type { ChatSeed } from "./components/Chat";
import { showErrorHUD } from "./lib/errors";
import { screenTranslatePrompt } from "./lib/prompts";
import { settings } from "./lib/settings";
import { captureRegion } from "./lib/system";

export default async function Command() {
  await closeMainWindow();
  try {
    const capture = await captureRegion(true);
    if (!capture) return;
    const seed: ChatSeed = {
      prompt: "Translate the text on screen",
      instruction: screenTranslatePrompt(settings().langs),
      attachments: [{ kind: "image", ...capture }],
      send: true,
    };
    await launchCommand({ name: "ask", type: LaunchType.UserInitiated, context: seed });
  } catch (error) {
    await showErrorHUD(error);
  }
}
