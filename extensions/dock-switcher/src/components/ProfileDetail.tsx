import { List } from "@raycast/api";
import { HistoryEntry } from "../utils/history";

interface ProfileDetailProps {
  entry: HistoryEntry;
}

export function ProfileDetail({ entry }: ProfileDetailProps) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Profile" text={entry.profileName} />
          <List.Item.Detail.Metadata.Label title="Created" text={new Date(entry.timestamp).toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={`Items (${entry.dockItems.length})`} />
          {entry.dockItems.map((item, index) => {
            const iconPath = item.path.startsWith("file://")
              ? decodeURIComponent(item.path.replace("file://", ""))
              : item.path;

            return (
              <List.Item.Detail.Metadata.Label
                key={index}
                title={item.name}
                text={item.type}
                icon={{ fileIcon: iconPath }}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
