import { Action, ActionPanel, Detail, environment, open, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { headerSVG } from "../lib/avatar";
import { imageFile } from "../lib/files";
import { CachedContact, contactFor, useContacts } from "../lib/contacts";
import { sparkJSON } from "../lib/spark";
import { threadMarkdown } from "../lib/thread";
import { AttachmentResult, ThreadMessage, ThreadResult, formatBytes } from "../lib/types";
import { showSparkFailure } from "../lib/ui";
import EmailActions from "./EmailActions";
import { actionIcon } from "../lib/sparkIcons";

interface Props {
  messageId: string;
  onRemoved?: (id: string) => void;
}

export function loadThread(id: string): Promise<ThreadResult> {
  return sparkJSON<ThreadResult>(["thread", id]);
}

export default function ThreadView({ messageId, onRemoved }: Props) {
  const { pop } = useNavigation();
  const { data: thread, isLoading } = usePromise(loadThread, [messageId], {
    onError: (error) => showSparkFailure(error, "Couldn't load thread"),
  });

  const { contacts } = useContacts(thread?.messages.map((m) => m.from[0]?.email ?? "") ?? []);

  // Replies must target the newest real email so they join the conversation.
  const last = thread && [...thread.messages].reverse().find((m) => m.type !== "Chat Message");
  const subject = thread?.subject ?? "(no subject)";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={subject}
      markdown={
        thread
          ? threadMarkdown(thread, (message, name, detail) =>
              headerFile(contactFor(contacts, message.from[0]?.email), name, detail),
            )
          : ""
      }
      actions={
        thread && (
          <EmailActions
            inThread
            email={{
              id: String(last?.id ?? messageId),
              subject,
              fromEmail: last?.from[0]?.email,
              flags: last?.flags ?? [],
            }}
            onRemoved={() => {
              onRemoved?.(messageId);
              pop();
            }}
            extra={
              <>
                {thread.link && (
                  <Action.CopyToClipboard
                    title="Copy Spark Link"
                    content={thread.link}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "l" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "l" },
                    }}
                  />
                )}
                <AttachmentActions messages={thread.messages} />
              </>
            }
          />
        )
      }
    />
  );
}

function AttachmentActions({ messages }: { messages: ThreadMessage[] }) {
  const attachments = messages.flatMap((m) => m.attachments);
  if (!attachments.length) return null;
  return (
    <ActionPanel.Submenu
      title="Attachments"
      icon={actionIcon("Attachment")}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "a" },
        Windows: { modifiers: ["ctrl", "shift"], key: "a" },
      }}
    >
      {attachments.map((a) => (
        <Action
          key={a.id}
          title={`${a.name} (${formatBytes(a.size)})`}
          onAction={async () => {
            try {
              // Downloads through Spark when the file isn't cached yet.
              const file = await sparkJSON<AttachmentResult>(["attachment", String(a.id)], { timeout: 120_000 });
              await open(file.path);
            } catch (error) {
              await showSparkFailure(error, "Couldn't open attachment");
            }
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function headerFile(
  contact: CachedContact | null | undefined,
  name: string,
  detail: string,
): { url: string; width: number; height: number } | undefined {
  const header = headerSVG({ photo: contact?.photo, name, detail, dark: environment.appearance === "dark" });
  const url = imageFile("thread-headers", header.uri);
  return url ? { url, width: header.width, height: header.height } : undefined;
}
