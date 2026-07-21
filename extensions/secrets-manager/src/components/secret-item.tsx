import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { getStore } from "../lib/context";
import type { Secret } from "../lib/types";
import { SecretForm } from "./secret-form";
import { MoveToFolder } from "./move-to-folder";
import { tagColor } from "./tag-color";

export function SecretItem({ secret, reload }: { secret: Secret; reload: () => void }) {
  async function copy() {
    await Clipboard.copy(secret.value, { concealed: true });
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  }
  async function remove() {
    if (!(await confirmAlert({ title: `Delete "${secret.name}"?` }))) return;
    await getStore().remove(secret.id);
    reload();
  }
  return (
    <List.Item
      title={secret.name}
      subtitle={secret.folder.join("/")}
      keywords={secret.tags}
      accessories={secret.tags.map((t) => ({ tag: { value: t, color: tagColor(t) } }))}
      actions={
        <ActionPanel>
          <Action title="Copy Value" icon={Icon.Clipboard} onAction={copy} />
          <Action.Push
            title="Edit Secret"
            icon={Icon.Pencil}
            target={<SecretForm secret={secret} onSaved={reload} />}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
          <Action.Push
            title="Move to Folder"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            target={<MoveToFolder secret={secret} onMoved={reload} />}
          />
          <Action.Push title="Add Secret" icon={Icon.Plus} target={<SecretForm onSaved={reload} />} />
          <Action
            title="Delete Secret"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={remove}
          />
        </ActionPanel>
      }
    />
  );
}
