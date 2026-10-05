import { Action, ActionPanel, Icon, Keyboard, List, Toast, environment, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { openMint, plural, runMintSurface } from "./mint-cli";

import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";
import { UndoBatch, UndoKind, undoKind, undoPicture, undoTitle } from "./mint-panes";

type UndoListResponse = { items: UndoBatch[] };
type UndoResponse = { batchID: string; restoredCount: number; restoredPaths: string[] };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <UndoList cli={resolution.path} />;
}

/** Mint's recent runs on the left, what each one changed on the right; ↵ puts it back. */
function UndoList({ cli }: { cli: string }) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runMintSurface<UndoListResponse>(path, { action: "undo.list" }, 30_000),
    [cli],
  );
  const appearance = environment.appearance === "light" ? "light" : "dark";

  async function undo(batch: UndoBatch) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Putting it back…" });
    try {
      const result = await runMintSurface<UndoResponse>(cli, {
        action: "undo.execute",
        batchID: batch.id,
        confirmed: true,
      });
      // The window stays open: the run leaves the list, and the toast says what came back.
      if (result.restoredCount >= batch.operationCount) {
        toast.style = Toast.Style.Success;
        toast.title = `Put back ${plural(result.restoredCount, "item")}`;
        revalidate();
        return;
      }
      toast.style = result.restoredCount ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = `Put back ${result.restoredCount} of ${batch.operationCount}`;
      toast.message = "The rest were moved, changed or replaced since. Mint never overwrites a file.";
      revalidate();
    } catch (undoError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not put it back";
      toast.message = undoError instanceof Error ? undoError.message : String(undoError);
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={(data?.items.length ?? 0) > 0}
      navigationTitle="Undo Mint Action"
      searchBarPlaceholder="Search what Mint did"
    >
      {error ? (
        <List.EmptyView title="Mint could not read its history" description={error.message} icon={Icon.Warning} />
      ) : null}
      {!error && !isLoading && data?.items.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing to undo"
          description="What Mint moves or cleans to the Trash shows here for 90 days."
        />
      ) : null}
      <List.Section title="Can be put back">
        {data?.items.map((batch) => {
          const kind = undoKind(batch.trigger);
          return (
            <List.Item
              key={batch.id}
              icon={ICONS[kind]}
              title={undoTitle(batch)}
              keywords={batch.fileNames}
              accessories={[{ date: new Date(batch.timestamp) }]}
              detail={<List.Item.Detail markdown={undoPicture(batch, appearance)} />}
              actions={
                <ActionPanel>
                  <Action title="Put It Back" icon={Icon.ArrowCounterClockwise} onAction={() => undo(batch)} />
                  <Action.ShowInFinder path={batch.folderPath} />
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                    <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

const ICONS: Record<UndoKind, Icon> = {
  organize: Icon.Folder,
  trash: Icon.Trash,
  uninstall: Icon.AppWindow,
  optimize: Icon.Stars,
  other: Icon.Document,
};
