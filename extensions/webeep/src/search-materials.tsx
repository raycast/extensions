import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { FileItem } from "./components/course-contents";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { collectFiles, CourseFile, fetchCourseContents } from "./lib/contents";
import { Course, fetchCoursesInProgress } from "./lib/courses";
import { Lang } from "./lib/mlang";
import { getLanguage } from "./lib/prefs";

interface MaterialsIndex {
  courses: Course[];
  files: { file: CourseFile; course: Course }[];
}

async function fetchMaterials(lang: Lang): Promise<MaterialsIndex> {
  const courses = await fetchCoursesInProgress(lang);
  const perCourse = await Promise.all(
    courses.map(async (course) => {
      const sections = await fetchCourseContents(course.id, lang);
      return collectFiles(sections).map((file) => ({ file, course }));
    }),
  );
  const files = perCourse.flat().sort((a, b) => (b.file.modified?.getTime() ?? 0) - (a.file.modified?.getTime() ?? 0));
  return { courses, files };
}

export default function SearchMaterials() {
  const lang = getLanguage();
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const { data, isLoading, error } = useCachedPromise(fetchMaterials, [lang], { onError: showError });

  const files = (data?.files ?? []).filter(
    (entry) => courseFilter === "all" || String(entry.course.id) === courseFilter,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search files across courses in progress…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by course" storeValue onChange={setCourseFilter}>
          <List.Dropdown.Item title="All Courses" value="all" />
          <List.Dropdown.Section title="Courses">
            {(data?.courses ?? []).map((course) => (
              <List.Dropdown.Item key={course.id} title={course.name} value={String(course.id)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && files.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No files found"
          description="Your courses in progress have no downloadable files"
        />
      ) : (
        files.map(({ file, course }) => (
          <FileItem
            key={`${course.id}:${file.id}`}
            file={file}
            course={course}
            subtitle={`${course.name} › ${file.moduleName}`}
          />
        ))
      )}
    </List>
  );
}
