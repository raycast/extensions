import { Icon, List } from "@raycast/api";

import { VaultNote } from "@/types/dcli";

type Props = {
  note: VaultNote;
};

export const ListItemNote = ({ note }: Props) => {
  const hasAttachments = (note.attachments?.length ?? 0) > 0;

  return (
    <List.Item
      title={note.title}
      detail={
        <List.Item.Detail
          markdown={note.content}
          metadata={
            hasAttachments && (
              <List.Item.Detail.Metadata>
                {note.attachments?.map((attachment) => (
                  <List.Item.Detail.Metadata.Label
                    key={attachment.id}
                    title={attachment.filename}
                    icon={mimeTypeIcon(attachment.type)}
                  />
                ))}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
      accessories={[
        {
          icon: hasAttachments ? Icon.Paperclip : undefined,
          tooltip: hasAttachments ? "Attachments" : undefined,
        },
      ]}
    />
  );
};

function mimeTypeIcon(mimeType: string) {
  if (mimeType.includes("image")) {
    return Icon.Image;
  }

  if (mimeType.includes("video")) {
    return Icon.Video;
  }

  if (mimeType.includes("audio")) {
    return Icon.Music;
  }

  return Icon.Document;
}
