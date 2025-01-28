import { ActionPanel, Action, Icon, List, useNavigation, showToast, Toast } from "@raycast/api";
import CoursePages from "./course-pages";
import { useCourses } from "./hooks/useCourses";

export default function CoursesCommand() {
  const { isLoading, data, error } = useCourses();
  const { push } = useNavigation();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch courses", error.message);
  }

  function getIcon(course: { published: boolean; isFavorite: boolean }) {
    if (!course.published) {
      return { source: Icon.WrenchScrewdriver };
    }
    if (course.isFavorite) {
      return { source: Icon.Star };
    }
    return { source: Icon.Book };
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search courses...">
      {data?.map((course) => {
        return (
          <List.Item
            key={course.courseCode}
            icon={getIcon(course)}
            title={course.name || "Untitled Course"}
            accessories={[{ tag: course.courseCode || "No course code" }]}
            actions={
              <ActionPanel>
                <Action
                  title="View More"
                  onAction={() => push(<CoursePages course={course} />)} // Navigate to CoursePages
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
