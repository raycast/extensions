import fs from "node:fs";
import path from "node:path";
import {
  captureException,
  closeMainWindow,
  environment,
  openExtensionPreferences,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { APICallError } from "ai";
import { nanoid } from "nanoid";
import { AI_CONFIG, FILE_NAMES } from "./constants";
import { processCapture } from "./utils/process-capture";
import { escapeShellPath, sanitizePath } from "./utils/sanitize";
import { getStacks } from "./utils/stacks";

export default async function main() {
  closeMainWindow({ popToRootType: PopToRootType.Suspended });

  const stacks = await getStacks();

  if (!stacks.length) {
    await showHUD("Create at least one stack to start capturing.");
    return;
  }

  const capturesDir = path.join(environment.supportPath, FILE_NAMES.CAPTURES_DIR);

  try {
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }
  } catch (error) {
    captureException(new Error("Failed to create captures directory", { cause: error }));
    await showHUD("Failed to create captures directory.");
    return;
  }

  const id = nanoid();
  const sanitizedId = sanitizePath(id);
  const outPath = path.join(capturesDir, `${sanitizedId}.png`);
  const escapedPath = escapeShellPath(outPath);
  const shellScript = `screencapture -i '${escapedPath}'`;

  try {
    await runAppleScript(`do shell script "${shellScript}"`, {
      timeout: AI_CONFIG.SCREENSHOT_TIMEOUT_MS,
    });
  } catch (error) {
    captureException(
      new Error("Screenshot capture timed out or was cancelled", {
        cause: error,
      }),
    );
    await showHUD("Failed to create new capture. Possibly timed out.");
    return;
  }

  if (!fs.existsSync(outPath)) {
    captureException(new Error(`Screenshot not found at path: ${outPath}`));
    await showHUD("Capture was cancelled.");
    return;
  }

  await showHUD("Creating new capture...");

  try {
    await processCapture({ id, path: outPath });
    await showHUD("Capture created successfully!");
  } catch (error) {
    if (error instanceof APICallError) {
      const { statusCode, message } = error;
      const [title] = message.split(".");
      if (statusCode === 401) {
        await showHUD(title);
        openExtensionPreferences();
      }
    } else {
      captureException(new Error("Failed to process capture", { cause: error }));
      await showHUD("Failed to process capture. Please try again.");
    }
  }
}
