import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getAnnouncements } from "./data/announcement";
import { AnnouncementDetail } from "./components/announcement-detail";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data: announcements } = useCachedPromise(getAnnouncements, [], {
    initialData: null,
    onError: async () => {
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch announcements" });
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Announcements"
      searchBarPlaceholder="Search AzTU LMS Announcements"
    >
      {announcements?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.created_at}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Announcement Details"
                target={<AnnouncementDetail title={item.title} id={item.id} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.Bell} title="No Announcements" description="No announcements found." />
    </List>
  );
}
