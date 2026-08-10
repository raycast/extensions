import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { AnnouncementDetails } from "./AnnouncementDetails";
import { Announcement } from "./types/common";

export function AnnouncementItem({ announcement }: { announcement: Announcement }) {
  return (
    <List.Item
      icon={{ source: Icon.Info, tintColor: Color.Blue }}
      title={announcement.title}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.MagnifyingGlass}
            target={<AnnouncementDetails announcement={announcement} />}
          />
        </ActionPanel>
      }
    />
  );
}
