import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { list_processes } from "rust:../rust";
import { startCaffeinate } from "./utils";

interface Process {
  name: string;
  pid: string;
  windowHandle?: number;
}

async function getRunningProcesses(): Promise<Process[]> {
  if (process.platform === "win32") {
    const processes = await list_processes();
    return processes.map((process) => ({
      name: process.name,
      pid: String(process.pid),
      windowHandle: process.windowHandle,
    }));
  }

  const ids = (
    await runAppleScript(
      `tell application "System Events" to get the unix id of every process whose background only is false`,
    )
  ).split(", ");
  const names = (
    await runAppleScript(
      `tell application "System Events" to get the name of every process whose background only is false`,
    )
  ).split(", ");

  return names.map((name, index) => ({ name, pid: ids[index] }));
}

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const running = await getRunningProcesses();
      if (!isMounted) return;
      setProcesses(running);
      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Caffeinate"
            onSubmit={async (data) => {
              const process = processes.find((p) => p.pid === data.process);
              const windowArg = process?.windowHandle ? ` -wh ${process.windowHandle}` : "";
              await startCaffeinate(
                { menubar: true, status: true },
                "Caffeinate process started",
                `-w ${data.process}${windowArg}`,
              );
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="process" title="Application">
        {processes.map((process) => (
          <Form.Dropdown.Item key={process.pid} value={process.pid} title={process.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
