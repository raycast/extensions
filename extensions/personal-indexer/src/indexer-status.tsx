import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { spawn } from "node:child_process";
import { useCallback, useEffect, useState } from "react";
import { AddFolderForm } from "./add-folder";
import { getStatus, reindex, removeFolder, serviceDirectory, type StatusResponse } from "./api";

export default function IndexerStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const directory = serviceDirectory();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getStatus());
      setError(null);
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!status) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Indexer is offline"
          description={error ?? "Start it with npm run service from the personal-indexer repo."}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void refresh()} />
              {directory ? <Action title="Start Service" icon={Icon.Play} onAction={() => startService(directory, refresh)} /> : null}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Service">
        <List.Item title="Status" subtitle="Online" accessories={[{ text: status.scanning ? "Scanning" : "Idle" }]} actions={actions(directory, refresh)} />
        <List.Item
          title="Model"
          subtitle={`${status.model} · ${status.modelId}`}
          accessories={[{ text: status.modelLoaded ? "Loaded" : "Unloaded" }]}
          actions={actions(directory, refresh)}
        />
        <List.Item title="Files" subtitle={String(status.fileCount)} accessories={[{ text: `${status.chunkCount} chunks` }]} actions={actions(directory, refresh)} />
        <List.Item title="Search tools" subtitle={toolSubtitle(status.tools)} actions={actions(directory, refresh)} />
        {status.lastError ? <List.Item title="Last error" subtitle={status.lastError} /> : null}
      </List.Section>
      <List.Section title="Folders" subtitle={status.folders.length === 0 ? "None yet" : undefined}>
        {status.folders.map((folder) => (
          <List.Item key={folder} title={folder} icon={Icon.Folder} actions={actions(directory, refresh, folder)} />
        ))}
      </List.Section>
    </List>
  );
}

function toolSubtitle(tools: StatusResponse["tools"]): string {
  if (!tools) return "Unknown";
  const missing = [tools.ripgrep ? null : "ripgrep", tools.fzf ? null : "fzf"].filter((name): name is string => name !== null);
  if (missing.length === 0) return "ripgrep and fzf";
  return `Missing ${missing.join(" and ")}`;
}

function actions(directory: string | undefined, refresh: () => Promise<void>, folder?: string) {
  return (
    <ActionPanel>
      <Action
        title="Reindex"
        icon={Icon.ArrowClockwise}
        onAction={async () => {
          try {
            await reindex();
            await showToast({ style: Toast.Style.Success, title: "Reindex started" });
            await refresh();
          } catch (error) {
            await showToast({ style: Toast.Style.Failure, title: "Reindex failed", message: error instanceof Error ? error.message : String(error) });
          }
        }}
      />
      <Action.Push title="Add Folder" icon={Icon.Plus} target={<AddFolderForm onAdded={() => void refresh()} />} />
      {folder ? (
        <Action
          title="Remove Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Remove folder?",
              message: folder,
              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
            });
            if (!confirmed) return;
            try {
              await removeFolder(folder);
              await showToast({ style: Toast.Style.Success, title: "Folder removed" });
              await refresh();
            } catch (error) {
              await showToast({ style: Toast.Style.Failure, title: "Could not remove folder", message: error instanceof Error ? error.message : String(error) });
            }
          }}
        />
      ) : null}
      {directory ? <Action title="Start Service" icon={Icon.Play} onAction={() => startService(directory, refresh)} /> : null}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void refresh()} />
    </ActionPanel>
  );
}

function startService(directory: string, refresh: () => Promise<void>): void {
  const child = spawn("npm", ["run", "service"], {
    cwd: directory,
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  child.unref();
  void showToast({ style: Toast.Style.Success, title: "Starting indexer" });
  setTimeout(() => {
    void refresh();
  }, 1500);
}
