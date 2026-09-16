import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthEmptyView, isAuthError, showError, showPartialFailure } from "./components/errors";
import { collectLinks, CourseLink, fetchCourseContents } from "./lib/contents";
import { Course, fetchCoursesInProgress } from "./lib/courses";
import { Lang } from "./lib/mlang";
import { getLanguage } from "./lib/prefs";
import { collectSettled, reportPartialFailures } from "./lib/settle";

interface CourseLinks {
  course: Course;
  links: CourseLink[];
}

async function fetchRecordingLinks(lang: Lang): Promise<CourseLinks[]> {
  const courses = await fetchCoursesInProgress(lang);
  const { values, errors } = await collectSettled(
    courses.map(async (course) => {
      const sections = await fetchCourseContents(course.id, lang);
      const links = collectLinks(sections, course.id).filter((link) => link.kind !== "link");
      return { course, links };
    }),
  );
  reportPartialFailures(errors, values.length, (failed) => showPartialFailure(failed));
  return values.filter((entry) => entry.links.length > 0);
}

export default function OpenRecordings() {
  const lang = getLanguage();
  const { data, isLoading, error } = useCachedPromise(fetchRecordingLinks, [lang], { onError: showError });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recordings and virtual classrooms…">
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Video}
          title="No recordings found"
          description="None of your courses in progress links a recording archive or virtual classroom"
        />
      ) : (
        data?.map(({ course, links }) => (
          <List.Section key={course.id} title={course.name} subtitle={course.code}>
            {links.map((link) => (
              <List.Item
                key={link.id}
                title={link.name}
                subtitle={link.sectionName}
                icon={link.kind === "recording" ? Icon.Video : Icon.Camera}
                keywords={[course.name, course.code ?? "", link.kind]}
                accessories={[{ tag: link.kind === "recording" ? "Recordings" : "Virtual classroom" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={link.kind === "recording" ? "Open Recordings" : "Join Virtual Classroom"}
                      url={link.url}
                    />
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={link.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Course in Browser"
                      url={course.viewUrl}
                      shortcut={Keyboard.Shortcut.Common.OpenWith}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
