import { Action, ActionPanel, Form, Icon, Keyboard, useNavigation } from "@raycast/api";
import { archiveThread, renameThread, threadURL } from "../lib/amp";
import { withToast } from "../lib/ui";

function RenameForm({ id, title, onDone }: { id: string; title: string; onDone?: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Thread"
            onSubmit={async ({ name }: { name: string }) => {
              const done = await withToast("Renaming…", () => renameThread(id, name), "Renamed");
              if (done !== undefined) {
                onDone?.();
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Title" placeholder="Thread title" defaultValue={title} />
    </Form>
  );
}

/** The copy, rename, and archive actions every thread row and the thread view share. */
export function ThreadSecondaryActions({
  id,
  title,
  onChange,
  onArchived,
}: {
  id: string;
  title: string;
  onChange?: () => void;
  onArchived?: () => void;
}) {
  const url = threadURL(id);
  return (
    <>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Mention"
          content={`@${id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Continue Command"
          content={`amp threads continue ${id}`}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<RenameForm id={id} title={title} onDone={onChange} />}
        />
        <Action
          title="Archive"
          icon={Icon.Tray}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const done = await withToast("Archiving…", () => archiveThread(id), "Archived");
            if (done !== undefined) {
              onChange?.();
              onArchived?.();
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
