import { closeMainWindow, launchCommand, LaunchType, LocalStorage, PopToRootType, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { captureImage, getCapture } from "./images.js";
import { LAST_CONVERSATION_KEY, parseSessionTarget, type SessionTarget } from "./session-target.js";

const execute = promisify(execFile);
const recoveryKey = "screenshot-recovery-v1";
async function openCapture(id: string) {
  await LocalStorage.setItem(recoveryKey, id);
  await launchCommand({ name: "recent", type: LaunchType.UserInitiated, context: { captureId: id } });
  await LocalStorage.removeItem(recoveryKey);
}
export default async function Screenshot() {
  // A failed command launch must not strand a screenshot. The next activation reopens it before capturing another.
  try {
    const pending = await LocalStorage.getItem<string>(recoveryKey);
    if (pending) {
      await getCapture(pending);
      await openCapture(pending);
      return;
    }
  } catch {
    await showHUD("Saved screenshot could not open. Try Screenshot and Comment again; no message was sent.");
    return;
  }
  let target: SessionTarget | undefined;
  try {
    const saved = await LocalStorage.getItem<string>(LAST_CONVERSATION_KEY);
    if (saved) target = parseSessionTarget(saved);
  } catch {
    // A missing/invalid recent target opens explicit session selection after capture.
  }
  let image;
  try {
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    image = await captureImage(async (path) => {
      await execute("/usr/sbin/screencapture", ["-i", "-s", "-x", "-t", "png", path], { timeout: 120_000 });
    }, target);
  } catch {
    await showHUD("Screenshot unavailable. Check Raycast Screen Recording permission; no message was sent.");
    return;
  }
  if (!image) return;
  try {
    await openCapture(image.id);
  } catch {
    await showHUD("Screenshot saved. Run Screenshot and Comment again to reopen it; no message was sent.");
  }
}
