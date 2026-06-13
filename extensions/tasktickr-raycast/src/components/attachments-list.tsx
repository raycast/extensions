import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { fmtSize } from "@shared/task-core";
import { getAttachmentDownloadUrl } from "../lib/api";
import type { Attachment } from "../lib/types";

export function AttachmentsList({
  taskTitle,
  attachments,
}: {
  taskTitle: string;
  attachments: Attachment[];
}) {
  async function openAttachment(attachment: Attachment) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Resolving download URL…",
    });
    try {
      const url = await getAttachmentDownloadUrl(attachment.id);
      await open(url);
      toast.style = Toast.Style.Success;
      toast.title = "Opened in browser";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open attachment";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <List navigationTitle={`Attachments — ${taskTitle}`}>
      {attachments.map((attachment) => (
        <List.Item
          key={attachment.id}
          title={attachment.fileName}
          icon={Icon.Paperclip}
          accessories={[{ text: fmtSize(attachment.size) }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={() => openAttachment(attachment)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
