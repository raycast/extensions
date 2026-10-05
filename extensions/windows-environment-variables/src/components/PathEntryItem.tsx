import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { spawn } from "node:child_process";
import { expandEnvVars } from "../utils/path-utils.js";
import { PathEntry } from "../utils/types.js";

interface PathEntryItemProps {
  entry: PathEntry;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  addForm: React.JSX.Element;
  onRefresh: () => void | Promise<void>;
}

export function PathEntryItem({
  entry,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  addForm,
  onRefresh,
}: PathEntryItemProps) {
  const expanded = expandEnvVars(entry.path);

  return (
    <List.Item
      title={entry.path}
      icon={
        entry.exists
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      subtitle={entry.exists ? undefined : "(not found)"}
      accessories={[
        {
          tag: {
            value: entry.scope === "Machine" ? "System" : "User",
            color: entry.scope === "Machine" ? Color.Orange : Color.Blue,
          },
        },
        { tag: `#${entry.index + 1}` },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={entry.path} />
            <Action
              title="Open in Explorer"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() =>
                spawn("explorer.exe", [expanded], { detached: true })
              }
            />
            {entry.index > 0 && (
              <Action
                title="Move up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                onAction={onMoveUp}
              />
            )}
            {entry.index < total - 1 && (
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                onAction={onMoveDown}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Add New Entry"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={addForm}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onRemove}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
