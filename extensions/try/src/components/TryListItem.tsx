import { List, ActionPanel, Action, Icon, Keyboard, showHUD } from "@raycast/api";
import { TryDirectory } from "../types";
import { formatRelativeTime, touchDirectory } from "../lib/utils";
import { CreateForm } from "./CreateForm";
import { CloneForm } from "./CloneForm";

interface TryListItemProps {
  directory: TryDirectory;
  onRefresh: () => void;
}

export function TryListItem({ directory, onRefresh }: TryListItemProps) {
  return (
    <List.Item
      icon={Icon.Folder}
      title={directory.displayName || directory.name}
      subtitle={directory.datePrefix}
      accessories={[{ text: formatRelativeTime(directory.mtime) }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenWith path={directory.path} onOpen={() => touchDirectory(directory.path)} />
            <Action.ShowInFinder path={directory.path} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={directory.path}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Create New Directory"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateForm onSuccess={onRefresh} />}
            />
            <Action.Push
              title="Clone Repository"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              target={<CloneForm onSuccess={onRefresh} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Trash
              title="Move to Trash"
              icon={Icon.Trash}
              paths={directory.path}
              shortcut={Keyboard.Shortcut.Common.Remove}
              // Action.Trash closes the main window once the move completes, so a Toast
              // here would detach into a floating overlay — the exact behaviour we just
              // fixed in CreateForm. showHUD is the primitive meant for post-close
              // feedback and dismisses itself.
              //
              // onTrash is typed `=> void`, so this must not be async: returning a promise
              // into a void callback leaves any rejection unobserved rather than actionable.
              onTrash={() => {
                onRefresh();
                showHUD(`Moved "${directory.name}" to Trash`).catch(() => undefined);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
