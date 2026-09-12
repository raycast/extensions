import { ActionPanel, Icon, List } from "@raycast/api";
import type { IHistoryEvent } from "@putdotio/api-client";
import { toHumanFileSize, toTimeAgo } from "@putdotio/utilities";
import { TransferListItemFileActions } from "./TransferListItem";

export const HistoryListItem = ({ event }: { event: IHistoryEvent }) => {
  switch (event.type) {
    case "transfer_completed":
      return (
        <List.Item
          title={event.transfer_name}
          accessories={[
            {
              text: toTimeAgo(event.created_at),
            },
            {
              text: toHumanFileSize(event.transfer_size),
              icon: Icon.HardDrive,
            },
          ]}
          actions={
            <ActionPanel title={event.transfer_name}>
              <TransferListItemFileActions fileId={event.file_id} />
            </ActionPanel>
          }
        />
      );

    case "file_shared":
      return (
        <List.Item
          title={event.file_name}
          accessories={[
            {
              text: toTimeAgo(event.created_at),
            },
            {
              text: event.sharing_user_name,
              icon: Icon.Person,
            },
          ]}
        />
      );

    default:
      return <List.Item title={event.type} />;
  }
};
