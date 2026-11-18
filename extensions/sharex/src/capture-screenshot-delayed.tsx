import { showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";

const execFileAsync = promisify(execFile);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default async function Command(props: { arguments: Arguments.CaptureScreenshotDelayed }) {
  await closeMainWindow();

  const rawDelay = props.arguments.delay?.trim();
  const seconds = Math.max(1, parseInt(rawDelay || "3", 10) || 3);

  const toast = await showToast({ style: Toast.Style.Animated, title: `Capturing in ${seconds}s…` });

  for (let remaining = seconds - 1; remaining > 0; remaining--) {
    await sleep(1000);
    toast.title = `Capturing in ${remaining}s…`;
  }
  await sleep(50);
  await toast.hide();
  await sleep(950);

  try {
    const prefs = getPreferenceValues<Preferences>();
    const sharexPath = prefs.sharexPath || "C:\\Program Files\\ShareX\\ShareX.exe";

    await access(sharexPath);
    await execFileAsync(sharexPath, ["-RectangleRegion"]);
  } catch (error) {
    const title =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "ShareX.exe not found"
        : "Failed to start ShareX";
    toast.style = Toast.Style.Failure;
    toast.title = title;
    toast.message = String(error);
    await toast.show();
  }
}
