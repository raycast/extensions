import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export const killProcess = (pid: string, onSuccess?: () => void) => {
    exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Could not kill process", message: String(error) });
      } else {
        showToast({ style: Toast.Style.Success, title: "Process terminated", message: `PID ${pid} was terminated.` });
        if (onSuccess) {
          onSuccess();
        }
      }
    });
};