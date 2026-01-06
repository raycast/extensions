import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PortInfo {
  LocalPort: number;
  PID: number;
  ProcessName: string | null;
  State: string;
}

async function runPS(script: string): Promise<string> {
  const { stdout } = await execAsync(
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"').replace(/\n/g, " ")}"`,
    { timeout: 30000 },
  );
  return stdout;
}

async function getListeningPorts(): Promise<PortInfo[]> {
  const script = `
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Select-Object LocalPort, OwningProcess -Unique |
    Sort-Object LocalPort |
    ForEach-Object {
      $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue;
      [PSCustomObject]@{
        LocalPort = $_.LocalPort;
        PID = $_.OwningProcess;
        ProcessName = if ($p) { $p.ProcessName } else { 'Unknown' };
        State = 'Listen'
      }
    } | ConvertTo-Json -Depth 2 -Compress
  `;

  const result = await runPS(script);
  const trimmed = result.trim();

  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function killProcess(
  pid: number,
  processName: string | null,
): Promise<boolean> {
  try {
    await runPS(`Stop-Process -Id ${pid} -Force -ErrorAction Stop`);
    showToast({
      style: Toast.Style.Success,
      title: "Process Killed",
      message: `Killed ${processName || "process"} (PID: ${pid})`,
    });
    return true;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Kill Process",
      message: error instanceof Error ? error.message : "Access denied",
    });
    return false;
  }
}

export default function ListPorts() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPorts() {
    setIsLoading(true);
    setError(null);
    try {
      const portList = await getListeningPorts();
      setPorts(portList);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPorts();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to List Ports"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {ports.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Listening Ports"
          description="No processes are currently listening on any ports"
        />
      ) : (
        ports.map((port) => (
          <List.Item
            key={`${port.LocalPort}-${port.PID}`}
            icon={{ source: Icon.Network, tintColor: Color.Blue }}
            title={`Port ${port.LocalPort}`}
            subtitle={port.ProcessName || "Unknown"}
            accessories={[
              { text: `PID: ${port.PID}` },
              { tag: { value: port.State, color: Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Kill Process"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await killProcess(port.PID, port.ProcessName);
                    await fetchPorts();
                  }}
                />
                <Action
                  title="Copy Port"
                  icon={Icon.Clipboard}
                  onAction={() => {
                    Clipboard.copy(String(port.LocalPort));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied Port",
                      message: String(port.LocalPort),
                    });
                  }}
                />
                <Action
                  title="Copy Pid"
                  icon={Icon.Clipboard}
                  onAction={() => {
                    Clipboard.copy(String(port.PID));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied PID",
                      message: String(port.PID),
                    });
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={fetchPorts}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
