import {
  closeMainWindow,
  environment,
  getApplications,
  open,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  getAction,
  MenuAction,
  parseNativeResult,
  resultMessage,
  SUNFLOWER_BUNDLE_ID,
} from "./actions";

const execFileAsync = promisify(execFile);

export async function performAction(action: MenuAction): Promise<void> {
  const applications = await getApplications();
  const application = applications.find(
    (candidate) => candidate.bundleId === SUNFLOWER_BUNDLE_ID,
  );
  if (!application) {
    throw new Error(
      "Install Sunflower for Mac from sunflower.karakabakov.com, then try again.",
    );
  }

  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await open(application.path);
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    [
      join(environment.assetsPath, "control.applescript"),
      action.menu,
      action.item,
    ],
    { timeout: 15000, maxBuffer: 16 * 1024 },
  );
  const result = parseNativeResult(stdout);
  if (result !== "ok") throw new Error(resultMessage(result));
  await showHUD(action.success);
}

export function errorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Unable to control Sunflower";
  if (message.includes("-1743")) {
    return "Allow Raycast to control System Events in System Settings → Privacy & Security → Automation, then try again.";
  }
  if (
    message.includes("-1719") ||
    message.includes("not allowed assistive access")
  ) {
    return resultMessage("permission");
  }
  return message;
}

export async function runCommand(id: string): Promise<void> {
  try {
    await performAction(getAction(id));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not control Sunflower",
      message: errorMessage(error),
    });
  }
}
