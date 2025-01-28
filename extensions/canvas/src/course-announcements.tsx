import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useCourseAnnouncements } from "./hooks/useCourseAnnouncements";

export default function CourseAnnouncements({ course }: { course: { name: string; id: string } }) {
  const { announcements, isLoading, error } = useCourseAnnouncements(course.id);

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch announcements", error.message);
  }

  return (
    <List
      navigationTitle={`Announcements for ${course.name}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search announcements..."
    >
      {announcements.map((announcement) => (
        <List.Item
          key={announcement.id}
          title={announcement.title}
          subtitle={`By ${announcement.userName}`}
          icon={Icon.Megaphone}
          accessories={[{ tag: new Date(announcement.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={announcement.htmlUrl} />
              <Action.CopyToClipboard title="Copy Announcement Link" content={announcement.htmlUrl} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
