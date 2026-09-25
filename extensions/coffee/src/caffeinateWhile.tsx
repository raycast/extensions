import { Action, ActionPanel, Form, Icon, popToRoot } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { list_processes } from "rust:../rust";
import { startCaffeinate } from "./utils";

interface Process {
  name: string;
  pid: string;
  windowHandle?: number;
  iconPath?: string;
}

async function getRunningProcesses(): Promise<Process[]> {
  if (process.platform === "win32") {
    const processes = await list_processes();
    return processes.map((process) => ({
      name: process.name,
      pid: String(process.pid),
      windowHandle: process.windowHandle,
      iconPath: process.path ?? undefined,
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

  // Best-effort app icons: resolve each process's executable back to its .app
  // bundle. Anything unexpected simply falls back to a generic window icon.
  let bundles: (string | undefined)[] | undefined;
  try {
    const files = (
      await runAppleScript(
        `tell application "System Events" to get the file of every process whose background only is false`,
      )
    )
      .split(", ")
      .map(decodeFileBundlePath);
    if (files.every((file) => file === undefined)) files.length = 0; // all unusable
    bundles = files.some((file) => file !== undefined) ? files : undefined;
  } catch {
    bundles = undefined;
  }

  return names.map((name, index) => ({
    name,
    pid: ids[index],
    iconPath: bundles?.[index],
  }));
}

function decodeFileBundlePath(file: string): string | undefined {
  const path = decodeURIComponent(file.replace(/^file:\/\/(localhost)?/, ""));
  const marker = "/Contents/MacOS/";
  const markerIndex = path.indexOf(marker);
  const bundlePath = markerIndex > 0 ? path.slice(0, markerIndex) : path;
  return bundlePath.endsWith(".app") ? bundlePath : undefined;
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
                process ? { kind: "while", appName: process.name } : undefined,
              );
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="process" title="Application">
        {processes.map((process) => (
          <Form.Dropdown.Item
            key={process.pid}
            value={process.pid}
            title={process.name}
            icon={process.iconPath ? { fileIcon: process.iconPath } : Icon.AppWindow}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
