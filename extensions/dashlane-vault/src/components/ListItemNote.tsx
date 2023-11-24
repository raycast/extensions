import { ActionPanel, Icon, List } from "@raycast/api";

import { useNotesContext } from "@/context/notes";
import { VaultNote } from "@/types/dcli";
import FavoriteActions from "./actions/FavoriteActions";
import SyncAction from "./actions/note/SyncAction";

type Props = {
  note: VaultNote;
};

export const ListItemNote = ({ note }: Props) => {
  const { isInitialLoaded } = useNotesContext();
  const hasAttachments = (note.attachments?.length ?? 0) > 0;

  return (
    <List.Item
      title={note.title}
      detail={
        <List.Item.Detail
          markdown={isInitialLoaded ? note.content : undefined}
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
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Item Actions">
            <FavoriteActions item={note} />
          </ActionPanel.Section>
          <SyncAction />
        </ActionPanel>
      }
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
