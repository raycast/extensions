import { ActionPanel, Action, Icon, List, useNavigation } from "@raycast/api";
import CourseModules from "./course-modules";
import CourseAssignments from "./course-assignments";
import CourseAnnouncements from "./course-announcements";

export default function CoursePages({ course }: { course: { name: string; id: string } }) {
  const { push } = useNavigation();

  // Mock data for course pages with subtitles
  const pages = [
    {
      title: "Modules",
      subtitle: "View and manage course modules",
      icon: Icon.List,
      component: <CourseModules course={course} />,
    },
    {
      title: "Assignments",
      subtitle: "View and submit assignments",
      icon: Icon.Pencil,
      component: <CourseAssignments course={course} />,
    },
    {
      title: "Announcements",
      subtitle: "Read course announcements",
      icon: Icon.Megaphone,
      component: <CourseAnnouncements course={course} />,
    },
  ];

  return (
    <List navigationTitle={`Pages for ${course.name}`} searchBarPlaceholder="Search course pages...">
      {pages.map((page) => (
        <List.Item
          key={page.title}
          title={page.title}
          subtitle={page.subtitle} // Adding subtitle to describe the page
          icon={{ source: page.icon }}
          actions={
            <ActionPanel>
              <Action title={`Open ${page.title}`} onAction={() => push(page.component)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
