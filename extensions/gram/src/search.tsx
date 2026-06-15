import { useGramContext, withGram } from "./components/with-gram";
import { useRecentWorkspaces } from "./hooks/use-recent-workspaces";
import { usePinnedEntries } from "./hooks/use-pinned-entries";
import { Entry, getEntry, getEntryPrimaryPath, isEntryMultiFolder } from "./lib/entry";
import { exists } from "./lib/filesystem";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { closeGramWindow, GramBuild, openWithGramCli } from "./lib/gram";
import { showOpenStatus } from "./lib/preferences";
import { isMultiFolder, Workspace } from "./lib/workspaces";
import { EntryItem } from "./components/entry-item";

export function Command() {
  const { dbPath, workspaceDbVersion, cliPath } = useGramContext();
  const { workspaces, isLoading, error, removeEntry, removeAllEntries, revalidate } = useRecentWorkspaces(
    dbPath,
    workspaceDbVersion,
  );

  const { pinnedEntries, pinEntry, unpinEntry, unpinAllEntries, moveUp, moveDown } = usePinnedEntries();

  const pinnedIds = new Set(Object.values(pinnedEntries).map((e) => e.id));

  const pinned = Object.values(pinnedEntries)
    .filter((entry) => canDisplayEntry(entry, cliPath))
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      ...entry,
      isOpen: workspaces[String(entry.id)]?.isOpen ?? false,
    }));

  const preferences = getPreferenceValues<Preferences>();
  const gramBuild = preferences.build as GramBuild;

  const closeEntry = async (entry: Entry) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Closing project..." });
    const success = await closeGramWindow(entry.title, gramBuild);
    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Project closed";
      setTimeout(revalidate, 500);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to close project";
      toast.message = "Window not found";
    }
  };

  const removeAndUnpinEntry = async (entry: Pick<Entry, "id" | "uri">) => {
    await removeEntry(entry.id);
    unpinEntry(entry);
  };

  const removeAndUnpinAllEntries = async () => {
    await removeAllEntries();
    unpinAllEntries();
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No Recent Projects"
        description={error ? "Verify that Gram is up-to-date" : undefined}
        icon="no-view.png"
      />
      <List.Section title="Pinned Projects">
        {pinned.map((entry) => {
          if (!entry) {
            return null;
          }
          return (
            <EntryItem
              key={entry.id}
              entry={entry}
              keywords={showOpenStatus ? [entry.isOpen ? "open" : "closed"] : undefined}
              actions={
                <EntryActions
                  entry={entry}
                  onCloseEntry={closeEntry}
                  onRemoveEntry={() => removeAndUnpinEntry(entry)}
                  onRemoveAllEntries={removeAndUnpinAllEntries}
                  revalidate={revalidate}
                  pinnedActions={
                    <>
                      <Action
                        title="Unpin Entry"
                        icon={Icon.PinDisabled}
                        onAction={() => unpinEntry(entry)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      />
                      {entry.order > 0 ? (
                        <Action
                          title="Move up"
                          icon={Icon.ArrowUp}
                          onAction={() => moveUp(entry)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                        />
                      ) : null}
                      {entry.order < pinned.length - 1 ? (
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          onAction={() => moveDown(entry)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                        />
                      ) : null}
                    </>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Recent Projects">
        {Object.values(workspaces)
          .filter((workspace) => !isPinnedWorkspace(workspace, pinnedIds))
          .filter((workspace) => canDisplayWorkspace(workspace, cliPath))
          .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
          .map((workspace) => {
            const entry = getEntry(workspace);

            if (!entry) {
              return null;
            }

            return (
              <EntryItem
                key={entry.id}
                entry={entry}
                keywords={showOpenStatus ? [entry.isOpen ? "open" : "closed"] : undefined}
                actions={
                  <EntryActions
                    entry={entry}
                    onCloseEntry={closeEntry}
                    onRemoveEntry={() => removeAndUnpinEntry(entry)}
                    onRemoveAllEntries={removeAndUnpinAllEntries}
                    revalidate={revalidate}
                    pinnedActions={
                      <Action
                        title="Pin Entry"
                        icon={Icon.Pin}
                        onAction={() => pinEntry(entry)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      />
                    }
                  />
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}

function canDisplayEntry(entry: Entry, cliPath: string | null): boolean {
  return (entry.type === "remote" || exists(entry.uri)) && (!isEntryMultiFolder(entry) || !!cliPath);
}

function canDisplayWorkspace(workspace: Workspace, cliPath: string | null): boolean {
  return (
    (workspace.type === "remote" || exists(workspace.uri) || !!workspace.wsl) &&
    (!isMultiFolder(workspace) || !!cliPath)
  );
}

function isPinnedWorkspace(workspace: Workspace, pinnedIds: Set<number>): boolean {
  return pinnedIds.has(workspace.id);
}

function EntryActions({
  entry,
  onCloseEntry,
  onRemoveEntry,
  onRemoveAllEntries,
  pinnedActions,
  revalidate,
}: {
  entry: Entry;
  onCloseEntry: (entry: Entry) => void;
  onRemoveEntry: () => void;
  onRemoveAllEntries: () => void;
  pinnedActions: React.ReactNode;
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      <OpenInGramAction entry={entry} revalidate={revalidate} />
      {entry.isOpen && (
        <Action
          title="Close Project Window"
          icon={Icon.XMarkCircle}
          onAction={() => onCloseEntry(entry)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        />
      )}
      {entry.type === "local" && <Action.ShowInFinder path={getEntryPrimaryPath(entry)} />}
      {pinnedActions}
      <RemoveActionSection onRemoveEntry={onRemoveEntry} onRemoveAllEntries={onRemoveAllEntries} />
    </ActionPanel>
  );
}

function OpenInGramAction({ entry, revalidate }: { entry: Entry; revalidate: () => void }) {
  const { app, cliPath } = useGramContext();
  const gramIcon = { fileIcon: app.path };

  // Helper to trigger staggered revalidations while Raycast is in the background.
  // This gives Gram enough time to launch and update its SQLite DB.
  const triggerRevalidation = () => {
    setTimeout(revalidate, 500);
    setTimeout(revalidate, 1500);
    setTimeout(revalidate, 3000);
  };

  // Multi-folder workspace - use CLI
  if (isEntryMultiFolder(entry) && cliPath) {
    const openMultiFolder = async () => {
      try {
        await closeMainWindow();
        await openWithGramCli(cliPath, entry.paths);
        triggerRevalidation();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open workspace",
          message: String(error),
        });
      }
    };
    return <Action title="Open in Gram" onAction={openMultiFolder} icon={gramIcon} />;
  }

  // If CLI available, use it for consistency (handles revalidation)
  if (cliPath) {
    const openSingleFolder = async () => {
      try {
        await closeMainWindow();
        await openWithGramCli(cliPath, [entry.paths[0]]);
        triggerRevalidation();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open workspace",
          message: String(error),
        });
      }
    };
    return <Action title="Open in Gram" icon={gramIcon} onAction={openSingleFolder} />;
  }

  // Fallback: open via URI scheme (no revalidation)
  return (
    <Action.Open
      title="Open in Gram"
      target={entry.uri}
      application={app}
      icon={gramIcon}
      onOpen={triggerRevalidation}
    />
  );
}

function RemoveActionSection({
  onRemoveEntry,
  onRemoveAllEntries,
}: {
  onRemoveEntry: () => void;
  onRemoveAllEntries: () => void;
}) {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Trash}
        title="Remove from Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => onRemoveEntry()}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />

      <Action
        icon={Icon.Trash}
        title="Remove All Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => onRemoveAllEntries()}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
}

export default withGram(Command);
