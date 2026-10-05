import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getEnrolledCourses, getMoodlePrefs, getSiteInfo } from "./api/moodle";

interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  urlPath: string;
  icon: { source: Icon; tintColor?: Color };
}

export default function QuickLinksCommand() {
  const { moodleUrl } = getMoodlePrefs();

  const { data: siteInfo } = usePromise(getSiteInfo, []);
  const { data: courses, isLoading: isLoadingCourses } = usePromise(
    getEnrolledCourses,
    [],
  );

  const defaultLinks: QuickLinkItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      subtitle: "Overview of courses and upcoming deadlines",
      urlPath: "/my/",
      icon: { source: Icon.Gauge, tintColor: Color.Blue },
    },
    {
      id: "my-courses",
      title: "My Courses",
      subtitle: "View all currently enrolled courses",
      urlPath: "/my/courses.php",
      icon: { source: Icon.Book, tintColor: Color.Orange },
    },
    {
      id: "calendar",
      title: "Moodle Calendar",
      subtitle: "Monthly schedule and course deadlines",
      urlPath: "/calendar/view.php?view=upcoming",
      icon: { source: Icon.Calendar, tintColor: Color.Green },
    },
    {
      id: "grades",
      title: "Grades Overview",
      subtitle: "Check grades and feedback across courses",
      urlPath: "/grade/report/overview/index.php",
      icon: { source: Icon.CheckCircle, tintColor: Color.Purple },
    },
    {
      id: "private-files",
      title: "Private Files",
      subtitle: "Your personal Moodle cloud storage",
      urlPath: "/user/files.php",
      icon: { source: Icon.Folder, tintColor: Color.Yellow },
    },
    {
      id: "preferences",
      title: "User Preferences & Security Keys",
      subtitle: "Manage account settings and API tokens",
      urlPath: "/user/preferences.php",
      icon: { source: Icon.Gear, tintColor: Color.SecondaryText },
    },
  ];

  return (
    <List
      isLoading={isLoadingCourses}
      searchBarPlaceholder="Quick jump to Moodle pages and courses..."
    >
      <List.Section
        title={
          siteInfo ? `Moodle (${siteInfo.sitename})` : "General Navigation"
        }
        subtitle={siteInfo ? `Logged in as ${siteInfo.fullname}` : undefined}
      >
        {defaultLinks.map((item) => {
          const fullUrl = `${moodleUrl}${item.urlPath}`;
          return (
            <List.Item
              key={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={`Open ${item.title} in Browser`}
                    url={fullUrl}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={fullUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {courses && courses.length > 0 ? (
        <List.Section title="Jump to Course">
          {courses.map((c) => {
            const courseUrl = `${moodleUrl}/course/view.php?id=${c.id}`;
            return (
              <List.Item
                key={`course-${c.id}`}
                icon={{ source: Icon.Book, tintColor: Color.Orange }}
                title={c.fullname}
                subtitle={c.shortname}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Course Page in Browser"
                      url={courseUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy Course URL"
                      content={courseUrl}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
