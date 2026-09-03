import { useEffect } from "react";
import { Action, ActionPanel, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import tildify from "tildify";
import { useSessions } from "./lib/sessions";
import { usePinnedEntries } from "./lib/pinned";
import { openInNvim } from "./lib/nvim";
import { layout } from "./lib/preferences";
import { SessionEntry } from "./lib/types";

export default function SearchRecentSessions() {
  const { data, isLoading, error, removeEntry: removeEntryRaw } = useSessions();
  const { pinnedEntries, pin, unpin, moveUp, moveDown, getAllowedMovements } = usePinnedEntries();

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Failed to load sessions");
  }, [error]);

  const pinnedPaths = new Set(pinnedEntries.map((p) => p.path));
  const unpinnedSessions = data?.filter((s) => !pinnedPaths.has(s.path)) || [];

  const emptyTitle = error ? "Failed to load sessions" : "No recent sessions";
  const emptyDescription = error
    ? "Make sure Neovim is installed and try again."
    : "Open a file or folder in Neovim to see it here.";
  const emptyIcon = error ? Icon.ExclamationMark : Icon.Folder;

  const openAction = (entry: SessionEntry) => async () => {
    await openInNvim([entry.path]);
  };

  const removeEntry = async (entry: SessionEntry) => {
    try {
      await removeEntryRaw(entry);
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove session");
    }
  };

  if (layout === "grid") {
    return (
      <Grid isLoading={isLoading} searchBarPlaceholder="Search recent sessions..." columns={5}>
        <Grid.EmptyView icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        <Grid.Section title="Pinned">
          {pinnedEntries.map((entry) => (
            <SessionGridItem
              key={`pinned-${entry.path}`}
              entry={entry}
              pinned
              onOpen={openAction(entry)}
              onPin={() => pin(entry)}
              onUnpin={() => unpin(entry)}
              onMoveUp={() => moveUp(entry)}
              onMoveDown={() => moveDown(entry)}
              onRemove={() => removeEntry(entry)}
              movements={getAllowedMovements(entry)}
            />
          ))}
        </Grid.Section>
        <Grid.Section title="Recent Sessions">
          {unpinnedSessions.map((entry) => (
            <SessionGridItem
              key={entry.id}
              entry={entry}
              onOpen={openAction(entry)}
              onPin={() => pin(entry)}
              onUnpin={() => unpin(entry)}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              onRemove={() => removeEntry(entry)}
              movements={[]}
            />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent sessions...">
      <List.EmptyView icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      <List.Section title="Pinned">
        {pinnedEntries.map((entry) => (
          <SessionListItem
            key={`pinned-${entry.path}`}
            entry={entry}
            pinned
            onOpen={openAction(entry)}
            onPin={() => pin(entry)}
            onUnpin={() => unpin(entry)}
            onMoveUp={() => moveUp(entry)}
            onMoveDown={() => moveDown(entry)}
            onRemove={() => removeEntry(entry)}
            movements={getAllowedMovements(entry)}
          />
        ))}
      </List.Section>
      <List.Section title="Recent Sessions">
        {unpinnedSessions.map((entry) => (
          <SessionListItem
            key={entry.id}
            entry={entry}
            onOpen={openAction(entry)}
            onPin={() => pin(entry)}
            onUnpin={() => unpin(entry)}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            onRemove={() => removeEntry(entry)}
            movements={[]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function buildActions(
  entry: SessionEntry,
  props: {
    pinned?: boolean;
    onOpen: () => void;
    onPin: () => void;
    onUnpin: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    movements: ("up" | "down")[];
  },
) {
  const prettyPath = tildify(entry.path);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Open in Neovim" icon={Icon.Terminal} onAction={props.onOpen} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {!props.pinned ? (
          <Action
            title="Pin Entry"
            icon={Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={props.onPin}
          />
        ) : (
          <>
            <Action
              title="Unpin Entry"
              icon={Icon.PinDisabled}
              shortcut={{ modifiers: ["ctrl"], key: "p" }}
              onAction={props.onUnpin}
            />
            {props.movements.includes("up") && (
              <Action
                title="Move up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onAction={props.onMoveUp}
              />
            )}
            {props.movements.includes("down") && (
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={props.onMoveDown}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Path" content={prettyPath} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      </ActionPanel.Section>
      {entry.source === "recent" && (
        <ActionPanel.Section>
          <Action
            title="Remove from Recent"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={props.onRemove}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

type ItemProps = {
  entry: SessionEntry;
  pinned?: boolean;
  onOpen: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  movements: ("up" | "down")[];
};

function SessionListItem(props: ItemProps) {
  const { entry } = props;
  const prettyPath = tildify(entry.path);

  return (
    <List.Item
      title={entry.name}
      subtitle={prettyPath}
      icon={Icon.Folder}
      accessories={[
        {
          tag: entry.source,
          tooltip: `Source: ${entry.source}`,
        },
      ]}
      actions={buildActions(entry, props)}
    />
  );
}

function SessionGridItem(props: ItemProps) {
  const { entry } = props;
  const prettyPath = tildify(entry.path);

  return (
    <Grid.Item
      title={entry.name}
      subtitle={prettyPath}
      content={Icon.Folder}
      keywords={[entry.source, entry.name]}
      actions={buildActions(entry, props)}
    />
  );
}
