import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { fetchCoursesInProgress } from "./lib/courses";
import { Announcement, fetchAnnouncements } from "./lib/forum";
import { Lang } from "./lib/mlang";
import { getLanguage } from "./lib/prefs";

async function fetchLatestAnnouncements(lang: Lang): Promise<Announcement[]> {
  const courses = await fetchCoursesInProgress(lang);
  return fetchAnnouncements(courses, lang);
}

function markdownFor(announcement: Announcement): string {
  const attachments = announcement.attachments.map((a) => `- [${a.name}](${a.url})`).join("\n");
  return [
    `## ${announcement.subject}`,
    `**${announcement.author}** · ${announcement.courseName}`,
    announcement.message,
    attachments ? `### Attachments\n${attachments}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function ReadAnnouncements() {
  const lang = getLanguage();
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchLatestAnnouncements, [lang], {
    onError: showError,
  });

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search announcements…">
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Megaphone}
          title="No announcements"
          description="Your courses in progress have not posted anything yet"
        />
      ) : (
        data?.map((announcement) => (
          <List.Item
            key={announcement.id}
            title={announcement.subject}
            subtitle={announcement.courseName}
            icon={Icon.Megaphone}
            keywords={[announcement.author, announcement.courseName, announcement.preview]}
            accessories={[{ date: announcement.created }]}
            detail={
              <List.Item.Detail
                markdown={markdownFor(announcement)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Course" text={announcement.courseName} />
                    <List.Item.Detail.Metadata.Label title="Author" text={announcement.author} />
                    <List.Item.Detail.Metadata.Label title="Posted" text={announcement.created.toLocaleString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={announcement.url} />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={announcement.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={announcement.message}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                {announcement.attachments.map((attachment) => (
                  <Action.OpenInBrowser key={attachment.url} title={`Open ${attachment.name}`} url={attachment.url} />
                ))}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
