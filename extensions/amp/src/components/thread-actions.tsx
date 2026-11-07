import { Action, ActionPanel, Detail, Form, Icon, Keyboard, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { archiveThread, renameThread, sendMessage, threadMarkdown, threadURL } from "../lib/amp";
import { OpenThreadAction, withToast } from "../lib/ui";

export function SendMessageForm({ id, title }: { id: string; title: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Message ${title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            icon={Icon.Message}
            onSubmit={async ({ message }: { message: string }) => {
              if (!message.trim()) return;
              const sent = await withToast(
                "Sending…",
                async () => {
                  await sendMessage(id, message);
                  return true;
                },
                "Message sent",
              );
              if (sent) pop();
            }}
          />
          <OpenThreadAction id={id} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Steer the agent…" enableMarkdown autoFocus />
      <Form.Description text="Runs on the thread's own executor, like sending from the web." />
    </Form>
  );
}

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

export function ThreadTranscript({ id, title }: { id: string; title: string }) {
  const { data, isLoading } = usePromise(threadMarkdown, [id]);
  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={data ?? ""}
      actions={
        <ActionPanel>
          <OpenThreadAction id={id} />
          <Action.Push title="Send Message" icon={Icon.Message} target={<SendMessageForm id={id} title={title} />} />
          <Action.CopyToClipboard title="Copy as Markdown" content={data ?? ""} />
        </ActionPanel>
      }
    />
  );
}

export function ThreadActions({ id, title, onChange }: { id: string; title: string; onChange?: () => void }) {
  const url = threadURL(id);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <OpenThreadAction id={id} />
        <Action.Push title="Send Message" icon={Icon.Message} target={<SendMessageForm id={id} title={title} />} />
        <Action.Push
          title="Read Transcript"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<ThreadTranscript id={id} title={title} />}
        />
      </ActionPanel.Section>
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
            if (done !== undefined) onChange?.();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
