import { Alert, Clipboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  INSTALL_COMMAND,
  isUnauthedMessage,
  resolveYcPath,
  stripAnsi,
  truncate,
} from "./lib/yc";

const execFileAsync = promisify(execFile);

// `yc logout` clears credentials from ~/.yc. It's destructive (you'll need to
// `yc login` again), so confirm first; runs as a no-view command that reports
// via toast.
export default async function Command() {
  const binary = resolveYcPath();
  if (!binary) {
    await showFailureToast(new Error("YC CLI not found."), {
      title: "YC CLI not found",
      message: `Install it with: ${INSTALL_COMMAND}`,
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: "Log out of YC?",
    message:
      "This clears your stored YC CLI credentials from ~/.yc. You'll need to run yc login again to use the extension.",
    primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging out…",
  });
  try {
    await execFileAsync(binary, ["logout"], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    toast.style = Toast.Style.Success;
    toast.title = "Logged out of YC";
    toast.message = "Cleared credentials from ~/.yc";
  } catch (raw) {
    const err = raw as Error & { stdout?: string; stderr?: string };
    const message = truncate(
      stripAnsi(
        err.stderr || err.stdout || err.message || "Unknown error",
      ).trim(),
      300,
    );
    // Already logged out reads as a success, not a failure.
    if (isUnauthedMessage(message)) {
      toast.style = Toast.Style.Success;
      toast.title = "Already logged out";
      return;
    }
    // Mutate the existing animated toast rather than spawning a second one,
    // and attach a Copy Error action per House Style.
    toast.style = Toast.Style.Failure;
    toast.title = "Logout failed";
    toast.message = message;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: () => Clipboard.copy(message),
    };
  }
}
