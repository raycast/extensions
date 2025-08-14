import { showToast } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(exec);

const VOICEOVER_STARTER_COMMAND = "/System/Library/CoreServices/VoiceOver.app/Contents/MacOS/VoiceOverStarter";

const enableVoiceOver = async () => {
  return await execAsync(VOICEOVER_STARTER_COMMAND);
};

const main = async () => {
  try {
    await enableVoiceOver();
    await showToast({ title: "VoiceOver enabled" });
  } catch (err) {
    await showFailureToast(`Error enabling VoiceOver: ${err}`);
  }
};
export default main;
