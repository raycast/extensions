import {
  Action,
  ActionPanel,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);
import {
  getCaffeinateState,
  startCaffeinate,
  stopCaffeinate,
  CaffeinateState,
} from "./utils";

export default function Command() {
  const [state, setState] = useState<CaffeinateState>({ active: false });
  const [processes, setProcesses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadStateAndProcesses() {
    setIsLoading(true);
    try {
      const s = await getCaffeinateState();
      setState(s);

      // Query running processes using tasklist (much faster than powershell)
      const { stdout: output } = await execAsync("tasklist /NH /FO CSV");

      let processList: string[] = [];
      if (output) {
        const lines = output.split(/\r?\n/);
        const nameSet = new Set<string>();
        for (const line of lines) {
          if (!line.trim()) continue;
          // tasklist /FO CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
          const match = line.match(/^"([^"]+)"/);
          if (match && match[1]) {
            let procName = match[1];
            if (procName.toLowerCase().endsWith(".exe")) {
              procName = procName.slice(0, -4);
            }
            nameSet.add(procName);
          }
        }
        processList = Array.from(nameSet).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        );
      }
      setProcesses(processList);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load processes",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStateAndProcesses();
  }, []);

  async function handleStop() {
    setIsLoading(true);
    try {
      await stopCaffeinate();
      await showHUD("Caffeination stopped");
      await loadStateAndProcesses();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  async function handleStart(processName: string) {
    setIsLoading(true);
    try {
      await startCaffeinate("process", processName);
      await showHUD(`Caffeination started while ${processName} runs`);
      await loadStateAndProcesses();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search running processes..."
    >
      {state.active && (
        <List.Section title="Current Status">
          <List.Item
            title={
              state.mode === "indefinite"
                ? "Active: Caffeinated Indefinitely"
                : state.mode === "duration"
                  ? `Active: Caffeinated for ${Math.round(parseInt(state.value || "0") / 60)} minutes`
                  : `Active: Caffeinated while process '${state.value}' is running`
            }
            icon={Icon.MugSteam}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Caffeination"
                  onAction={handleStop}
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Select Process to Monitor">
        {processes.map((proc) => (
          <List.Item
            key={proc}
            title={proc}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action
                  title={`Caffeinate While ${proc} Runs`}
                  onAction={() => handleStart(proc)}
                  icon={Icon.Play}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
