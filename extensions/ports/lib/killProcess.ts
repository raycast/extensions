import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export const killProcess = (pid: string, onSuccess?: () => void) => {
    exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "No se pudo matar el proceso", message: String(error) });
      } else {
        showToast({ style: Toast.Style.Success, title: "Proceso terminado", message: `PID ${pid} fue terminado.` });
        if (onSuccess) {
          onSuccess();
        }
      }
    });
};