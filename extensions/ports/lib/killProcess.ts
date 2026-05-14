import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export const killProcess = (pid: string, onSuccess?: () => void) => {
  // Validate PID
  if (!pid || !/^\d+$/.test(pid)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid PID",
      message: "PID must be a valid number",
    });
    return;
  }

  // Try force kill directly for better reliability
  exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
    if (error) {
      // Parse common Windows error messages
      let errorMessage = "Unknown error occurred";

      if (error.message.includes("not found")) {
        errorMessage = "Process not found or already terminated";
      } else if (error.message.includes("Access is denied")) {
        errorMessage = "Access denied - process may require administrator privileges";
      } else if (error.message.includes("terminate")) {
        errorMessage = "Unable to terminate process";
      } else {
        errorMessage = error.message;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Could not kill process",
        message: errorMessage,
      });
    } else {
      showToast({
        style: Toast.Style.Success,
        title: "Process terminated",
        message: `PID ${pid} was successfully terminated`,
      });

      // Call success callback after a brief delay
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }
    }
  });
};
