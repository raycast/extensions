import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CourseContentsView } from "./components/course-contents";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { Course, fetchCourses, setCourseFavourite } from "./lib/courses";
import { getLanguage } from "./lib/prefs";

type Filter = "all" | "inprogress" | "past" | "favourites";

function matchesFilter(course: Course, filter: Filter): boolean {
  switch (filter) {
    case "inprogress":
      return course.inProgress;
    case "past":
      return !course.inProgress;
    case "favourites":
      return course.isFavourite;
    default:
      return true;
  }
}

export default function SearchCourses() {
  const lang = getLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchCourses, [lang], { onError: showError });

  async function toggleFavourite(course: Course) {
    try {
      await setCourseFavourite(course.id, !course.isFavourite);
      await showToast({
        style: Toast.Style.Success,
        title: course.isFavourite ? "Removed from favourites" : "Added to favourites",
      });
      revalidate();
    } catch (err) {
      await showError(err, "Could not update favourite");
    }
  }

  const courses = (data ?? []).filter((course) => matchesFilter(course, filter));
  const inProgress = courses.filter((course) => course.inProgress);
  const past = courses.filter((course) => !course.inProgress);

  function renderCourse(course: Course) {
    const accessories: List.Item.Accessory[] = [];
    if (course.isFavourite)
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favourite" });
    if (course.teachers) accessories.push({ text: course.teachers, tooltip: "Teachers" });
    if (course.year) accessories.push({ tag: course.year });
    return (
      <List.Item
        key={course.id}
        title={course.name}
        subtitle={course.code}
        icon={course.inProgress ? Icon.Book : { source: Icon.Book, tintColor: Color.SecondaryText }}
        keywords={[course.code ?? "", course.teachers ?? "", course.year ?? ""].filter(Boolean)}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push title="Browse Contents" icon={Icon.List} target={<CourseContentsView course={course} />} />
              <Action.OpenInBrowser title="Open in Browser" url={course.viewUrl} />
              <Action.CopyToClipboard
                title="Copy Link"
                content={course.viewUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={course.isFavourite ? "Remove from Favourites" : "Add to Favourites"}
                icon={course.isFavourite ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFavourite(course)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search courses by name, code or teacher…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter courses" storeValue onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All Courses" value="all" />
          <List.Dropdown.Item title="In Progress" value="inprogress" />
          <List.Dropdown.Item title="Past" value="past" />
          <List.Dropdown.Item title="Favourites" value="favourites" />
        </List.Dropdown>
      }
    >
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && courses.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No courses found"
          description="Try another filter or check your enrolments on WeBeep"
        />
      ) : (
        <>
          <List.Section title="In Progress" subtitle={`${inProgress.length}`}>
            {inProgress.map(renderCourse)}
          </List.Section>
          <List.Section title="Past" subtitle={`${past.length}`}>
            {past.map(renderCourse)}
          </List.Section>
        </>
      )}
    </List>
  );
}
