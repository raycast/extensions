import { ActionPanel, Action, List, Icon, Color, showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { execSync } from "child_process";
import { useMemo } from "react";

interface PortEntry {
  pid: string;
  command: string;
  port: string;
}

/**
 * Parse lsof -F pcn output into PortEntry[].
 *
 * The `-F pcn` flag produces parseable output where each line starts with
 * a field identifier character:
 *   p = PID
 *   c = command name
 *   n = name (contains the listening address, e.g. "*:3000" or "127.0.0.1:8080")
 *
 * A new process block starts with a `p` line. Each process can have multiple
 * `n` lines (one per listening port).
 */
function parseLsofOutput(stdout: string): PortEntry[] {
  const lines = stdout.split("\n").filter((l) => l.length > 0);
  const entries: PortEntry[] = [];
  const seen = new Set<string>();

  let currentPid = "";
  let currentCommand = "";

  for (const line of lines) {
    const prefix = line[0];
    const value = line.slice(1);

    switch (prefix) {
      case "p":
        currentPid = value;
        currentCommand = "";
        break;
      case "c":
        currentCommand = value;
        break;
      case "n": {
        // Extract port from name field like "*:3000" or "127.0.0.1:8080"
        const colonIdx = value.lastIndexOf(":");
        if (colonIdx === -1) break;

        const port = value.slice(colonIdx + 1);
        // Skip non-numeric ports (e.g. from IPv6 addresses without port)
        if (!/^\d+$/.test(port)) break;

        const key = `${currentPid}:${port}`;
        if (!seen.has(key) && currentPid && currentCommand) {
          seen.add(key);
          entries.push({
            pid: currentPid,
            command: currentCommand,
            port,
          });
        }
        break;
      }
    }
  }

  // Sort by port number ascending
  return entries.sort((a, b) => Number(a.port) - Number(b.port));
}

export default function Command() {
  const { isLoading, data, revalidate } = useExec("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pcn", "+c0"], {
    parseOutput: ({ stdout }) => parseLsofOutput(stdout),
    failureToastOptions: {
      title: "Failed to list ports",
      message: "Could not run lsof. Make sure you have the necessary permissions.",
    },
  });

  const ports = useMemo(() => data ?? [], [data]);

  async function killProcess(entry: PortEntry) {
    const confirmed = await confirmAlert({
      title: "Kill Process",
      message: `Kill "${entry.command}" (PID ${entry.pid}) on port ${entry.port}?`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Kill",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      // Re-verify the PID still belongs to the expected command to avoid killing a reused PID
      try {
        const currentCommand = execSync(`ps -p ${entry.pid} -c -o comm=`).toString().trim();
        if (currentCommand !== entry.command) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Stale Process",
            message: `PID ${entry.pid} is no longer ${entry.command}. Aborting kill.`,
          });
          revalidate();
          return;
        }
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Process Not Found",
          message: `PID ${entry.pid} is no longer running.`,
        });
        revalidate();
        return;
      }

      execSync(`kill -9 ${entry.pid}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Process Killed",
        message: `Killed ${entry.command} (PID ${entry.pid})`,
      });
      revalidate();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Kill Process",
        message: `Could not kill PID ${entry.pid}. It may require elevated permissions.`,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter ports...">
      {ports.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Check}
          title="No Listening Ports"
          description="No processes with open TCP ports found."
        />
      ) : (
        ports.map((entry) => (
          <List.Item
            key={`${entry.pid}-${entry.port}`}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            title={entry.command}
            subtitle={`:${entry.port}`}
            keywords={[entry.port, entry.pid, entry.command]}
            accessories={[{ tag: { value: `PID: ${entry.pid}`, color: Color.SecondaryText } }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={`http://localhost:${entry.port}`} />
                  <Action.CopyToClipboard
                    title="Copy Port"
                    content={entry.port}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard title="Copy PID" content={entry.pid} />
                  <Action.CopyToClipboard title="Copy Process Name" content={entry.command} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Kill Process"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => killProcess(entry)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
