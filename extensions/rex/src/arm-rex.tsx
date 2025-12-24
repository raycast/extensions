import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface ExecError extends Error {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  status?: number;
}

export default async function Command() {
  try {
    console.log("Starting Arm Rex command...");
    await closeMainWindow();

    console.log("Executing Rex AppleScript: arm");
    const result = await runAppleScript<string>(`tell application id "com.sorrenogroup.rex" to «event RexxArms»`, {
      timeout: 30000,
    });

    console.log("AppleScript result:", result);

    let success = true;
    let failureMessage = "Rex did not arm";
    try {
      const parsed = JSON.parse(result);
      if (typeof parsed?.success === "boolean") {
        success = parsed.success;
      }
      if (typeof parsed?.message === "string") {
        failureMessage = parsed.message;
      }
    } catch {
      // Non-JSON response; treat as success unless an error is thrown.
    }

    if (success) {
      await showHUD("✅ Rex Armed");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to arm Rex",
        message: failureMessage,
      });
    }
  } catch (error) {
    console.error("Error arming Rex:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const execError = error as ExecError;

    console.error("Error details:", {
      message: errorMessage,
      stdout: execError.stdout?.toString(),
      stderr: execError.stderr?.toString(),
      status: execError.status,
    });

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to arm Rex",
      message: errorMessage,
    });
  }
}
