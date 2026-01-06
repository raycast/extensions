import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface FormValues {
  port: string;
}

async function runPS(script: string): Promise<string> {
  const { stdout } = await execAsync(
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
    { timeout: 30000 },
  );
  return stdout;
}

export default function KillPort() {
  const [isLoading, setIsLoading] = useState(false);
  const [portError, setPortError] = useState<string | undefined>();

  function validatePort(value: string | undefined): boolean {
    if (!value || value.trim() === "") {
      setPortError("Port number is required");
      return false;
    }
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setPortError("Port must be between 1 and 65535");
      return false;
    }
    setPortError(undefined);
    return true;
  }

  async function handleSubmit(values: FormValues) {
    if (!validatePort(values.port)) {
      return;
    }

    setIsLoading(true);
    const port = parseInt(values.port, 10);

    try {
      // Find process using the port
      const pidResult = await runPS(
        `(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess`,
      );
      const pid = pidResult.trim();

      if (!pid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Port Not Found",
          message: `No process is using port ${port}`,
        });
        setIsLoading(false);
        return;
      }

      // Get process name
      const nameResult = await runPS(
        `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`,
      );
      const processName = nameResult.trim() || "Unknown";

      // Kill process
      await runPS(`Stop-Process -Id ${pid} -Force -ErrorAction Stop`);

      showToast({
        style: Toast.Style.Success,
        title: "Process Killed",
        message: `Killed ${processName} (PID: ${pid}) on port ${port}`,
      });

      popToRoot();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Kill Process",
        message: message.includes("denied")
          ? "Access denied. Try running as administrator."
          : message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Kill Process" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="port"
        title="Port Number"
        placeholder="e.g., 3000"
        error={portError}
        onChange={(value) => {
          if (portError) validatePort(value);
        }}
        onBlur={(event) => validatePort(event.target.value)}
      />
      <Form.Description text="Enter the port number of the process you want to kill." />
    </Form>
  );
}
