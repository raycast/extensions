import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatBytes, runMintSurface, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type UndoBatch = {
  id: string;
  kind: "journal" | "agent-archive";
  timestamp: string;
  trigger: string;
  folderPath: string;
  operationCount: number;
  totalBytes: number;
  fileNames: string[];
};

type UndoListResponse = { items: UndoBatch[] };
type UndoResponse = { batchID: string; restoredCount: number; restoredPaths: string[] };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <UndoList cli={resolution.path} />;
}

function UndoList({ cli }: { cli: string }) {
  const { data, error, isLoading, revalidate } = usePromise(async () =>
    runMintSurface<UndoListResponse>(cli, { action: "undo.list" }, 30_000),
  );

  async function undo(batch: UndoBatch) {
    const accepted = await confirmAlert({
      icon: Icon.ArrowCounterClockwise,
      title: `Restore ${batch.operationCount} item${batch.operationCount === 1 ? "" : "s"}?`,
      message:
        batch.kind === "agent-archive"
          ? "Mint will restore the original duplicate screenshot bytes inside this archived AI conversation. The file is revalidated before Mint writes it."
          : "Mint follows later Mint/Finder moves and restores only when the recorded file identity is still safe. Existing files are never overwritten.",
      primaryAction: { title: "Undo This Mint Action", style: Alert.ActionStyle.Default },
    });
    if (!accepted) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Mint is restoring files…" });
    try {
      const result = await runMintSurface<UndoResponse>(cli, {
        action: "undo.execute",
        batchID: batch.id,
        confirmed: true,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Restored ${result.restoredCount} item${result.restoredCount === 1 ? "" : "s"}`;
      toast.message = shortPath(batch.folderPath);
      await revalidate();
    } catch (undoError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not complete Undo";
      toast.message = undoError instanceof Error ? undoError.message : String(undoError);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Undo Mint Actions" searchBarPlaceholder="Filter recent Mint actions">
      {error ? (
        <List.EmptyView title="Could not load Undo history" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data?.items.length === 0 ? (
        <List.EmptyView
          title="Nothing to undo"
          description="Recoverable cleanup and organize actions will appear here."
          icon={Icon.CheckCircle}
        />
      ) : null}
      <List.Section title="Recoverable Actions" subtitle="Up to 90 days · no overwrite">
        {data?.items.map((batch) => (
          <List.Item
            key={batch.id}
            icon={{ source: triggerIcon(batch.trigger), tintColor: Color.Blue }}
            title={triggerTitle(batch.trigger)}
            subtitle={batch.fileNames.join(", ") || shortPath(batch.folderPath)}
            accessories={[
              { text: `${batch.operationCount} item${batch.operationCount === 1 ? "" : "s"}` },
              batch.totalBytes > 0 ? { text: formatBytes(batch.totalBytes) } : {},
              { date: new Date(batch.timestamp) },
            ]}
            actions={
              <ActionPanel>
                <Action title="Undo This Mint Action" icon={Icon.ArrowCounterClockwise} onAction={() => undo(batch)} />
                <Action.ShowInFinder path={batch.folderPath} />
                <Action title="Refresh History" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function triggerTitle(trigger: string): string {
  if (trigger === "agent-optimize") return "AI Archive Optimization";
  if (trigger === "uninstall") return "Uninstall";
  if (trigger === "declutter" || trigger.includes("cleanup")) return "Disk Cleanup";
  if (trigger === "reorganize" || trigger.includes("organize")) return "File Organization";
  return "Mint File Action";
}

function triggerIcon(trigger: string): Icon {
  if (trigger === "agent-optimize") return Icon.Stars;
  if (trigger === "uninstall") return Icon.AppWindow;
  if (trigger === "declutter" || trigger.includes("cleanup")) return Icon.Trash;
  if (trigger === "reorganize" || trigger.includes("organize")) return Icon.Folder;
  return Icon.Document;
}
