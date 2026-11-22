import { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { formatBytes, formatShortPath, formatUnixTime, inlineCode, modShortcut } from "./lib/format";
import {
  type ServerSnapshot,
  ensureServerRunning,
  getErrorDescription,
  getStatusSnapshot,
  isAbortError,
  restartServer,
  stopManagedServer,
} from "./lib/kensaku";
import { useExtensionPreferences } from "./lib/usePreferences";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unknown";
  }
  return value.toLocaleString();
}

function buildStatusMarkdown(snapshot: ServerSnapshot | null): string {
  if (!snapshot) {
    return "# Kensaku Index Status\n\nChecking local server and index status...";
  }

  const lines: string[] = ["# Kensaku Index Status", ""];

  if (snapshot.error) {
    lines.push(`> **Notice:** ${snapshot.error}`, "");
  }

  const roots = snapshot.indexState?.roots ?? snapshot.health?.health.state?.roots;
  lines.push("## Watched Folders", "");
  if (Array.isArray(roots) && roots.length > 0) {
    for (const root of roots) {
      lines.push(`- ${inlineCode(formatShortPath(root))}`);
    }
  } else {
    lines.push("_No watched folders reported yet._");
  }

  lines.push("", "## Local Configuration", "");
  lines.push(`- **CLI Binary:** ${inlineCode(formatShortPath(snapshot.cliPath))}`);
  lines.push(`- **Config Folder:** ${inlineCode(formatShortPath(snapshot.configDir))}`);
  lines.push(`- **HTTP Token:** ${snapshot.tokenPresent ? "Present" : "Not generated yet"}`);
  lines.push(
    `- **Background Process:** ${
      snapshot.managed.alive && snapshot.managed.pid
        ? `Managed by Raycast (PID ${snapshot.managed.pid})`
        : snapshot.running
          ? "External kensaku-cli serve process"
          : "Stopped"
    }`,
  );

  if (process.platform === "win32") {
    lines.push(
      "",
      "> On Windows, `kensaku-cli serve` opens the index read-only in memory. Use **Restart Search Server** if you want it to pick up newly indexed files immediately.",
    );
  }

  return lines.join("\n");
}

export default function IndexStatusCommand() {
  const prefs = useExtensionPreferences();
  const [snapshot, setSnapshot] = useState<ServerSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    getStatusSnapshot(prefs, {}, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setSnapshot(next);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          const { message } = getErrorDescription(error);
          setSnapshot((prev) => (prev ? { ...prev, running: false, error: message } : null));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [prefs, refreshNonce]);

  async function handleStartServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Kensaku Server...",
    });
    try {
      const { port } = await ensureServerRunning({ ...prefs, autoStartServer: true });
      toast.style = Toast.Style.Success;
      toast.title = "Kensaku Server Running";
      toast.message = `Listening on port ${port}`;
      refresh();
    } catch (error) {
      const { title, message } = getErrorDescription(error);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  async function handleRestartServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting Kensaku Server...",
    });
    try {
      const { port } = await restartServer(prefs);
      toast.style = Toast.Style.Success;
      toast.title = "Kensaku Server Restarted";
      toast.message = `Listening on port ${port}`;
      refresh();
    } catch (error) {
      const { title, message } = getErrorDescription(error);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  async function handleStopServer() {
    if (!snapshot) {
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Kensaku Server...",
    });
    try {
      const result = await stopManagedServer(snapshot.port);
      if (result.stillReachable) {
        toast.style = Toast.Style.Failure;
        toast.title = "Server Still Reachable";
        toast.message = "Server was started externally outside Raycast.";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = result.stopped ? "Kensaku Server Stopped" : "No Managed Server Running";
      }
      refresh();
    } catch (error) {
      const { title, message } = getErrorDescription(error);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  const health = snapshot?.health?.health;
  const state = snapshot?.indexState;

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildStatusMarkdown(snapshot)}
      metadata={
        snapshot ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Server">
              <Detail.Metadata.TagList.Item
                text={snapshot.running ? `Running (${snapshot.port})` : `Offline (${snapshot.port})`}
                color={snapshot.running ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Daemon Mode"
              text={health ? (health.daemon ? "Daemon Connected" : "In-Process Read-Only") : "Unknown"}
            />
            {health && (
              <Detail.Metadata.TagList title="Health Checks">
                <Detail.Metadata.TagList.Item
                  text={health.db ? "DB OK" : "DB Missing"}
                  color={health.db ? Color.Green : Color.Red}
                />
                <Detail.Metadata.TagList.Item
                  text={health.index ? "Index OK" : "Index Missing"}
                  color={health.index ? Color.Green : Color.Red}
                />
                <Detail.Metadata.TagList.Item
                  text={health.model ? "Model OK" : "Model Off"}
                  color={health.model ? Color.Green : Color.SecondaryText}
                />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Indexed Files" text={formatNumber(state?.files)} />
            <Detail.Metadata.Label title="Directories" text={formatNumber(state?.dirs)} />
            <Detail.Metadata.Label title="Content Docs" text={formatNumber(state?.content_docs)} />
            <Detail.Metadata.Label title="Semantic Units" text={formatNumber(state?.semantic_units)} />
            <Detail.Metadata.Label title="Index Size" text={formatBytes(state?.index_bytes)} />
            <Detail.Metadata.Label title="Embedding Model" text={state?.model_name || "None"} />
            <Detail.Metadata.Label title="Last Reconcile" text={formatUnixTime(state?.last_reconcile)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Server">
            {snapshot && !snapshot.running && (
              <Action title="Start Search Server" icon={Icon.Play} onAction={handleStartServer} />
            )}
            <Action
              title="Refresh Status"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
            <Action
              title="Restart Search Server"
              icon={Icon.RotateClockwise}
              shortcut={modShortcut(["shift"], "r")}
              onAction={handleRestartServer}
            />
            {snapshot?.managed.alive && (
              <Action
                title="Stop Search Server"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={handleStopServer}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Configuration">
            {snapshot && (
              <Action.Open
                title="Open Kensaku Config Folder"
                icon={Icon.Folder}
                target={snapshot.configDir}
                shortcut={modShortcut(["shift"], "o")}
              />
            )}
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={modShortcut([], ",")}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
