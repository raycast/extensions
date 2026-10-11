import { recordRender, useRenderReport } from "./helpers/profiling";
import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Course, getCourses, getTeachers } from "./api/classroom";
import { withAuthUser } from "./api/googleAuth";
import CourseStream from "./components/CourseStream";
import { withGoogleAuth } from "./components/withGoogleAuth";
import IssuesSection from "./components/IssuesSection";
import { formatDateTime, getCourseMarkdown, getEmptyTitle } from "./helpers/formatters";

import { ReactNode, useState } from "react";
import { useHiddenCourses } from "./settings/hiddenCourses";
import { readSettings } from "./settings/useSettings";
import { SettingsAction } from "./components/SettingsAction";
import { useClassroomQuery } from "./hooks/useClassroomQuery";
import RefreshAction from "./components/RefreshAction";

type StateFilter = "all" | "ACTIVE" | "ARCHIVED";

const SECTIONS = [
  { state: "ACTIVE", title: "Active" },
  { state: "ARCHIVED", title: "Archived" },
] as const;

function CourseListItem({
  course,
  selected,
  isHidden,
  onSetHidden,
  refreshCourses,
  settingsAction,
}: {
  course: Course;
  selected: boolean;
  // Left out of Show Assignments at the user's request
  isHidden: boolean;
  onSetHidden: (hidden: boolean) => void;
  refreshCourses: () => void;
  settingsAction: ReactNode;
}) {
  const renderStarted = performance.now();
  const {
    data: teachers,
    isLoading: teachersLoading,
    refresh: refreshTeachers,
  } = useClassroomQuery("teachers", (options) => getTeachers(course.id, options), [course.id], selected);
  course = { ...course, teachers: teachers ?? course.teachers };
  const refresh = () => {
    refreshCourses();
    if (selected) refreshTeachers();
  };
  const isActive = course.courseState === "ACTIVE";
  const emails = course.teachers?.flatMap(({ email }) => (email ? [email] : [])) ?? [];
  const calendarLink =
    course.calendarId &&
    withAuthUser(`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(course.calendarId)}`);
  const { Metadata } = List.Item.Detail;

  return recordRender(
    "courses",
    renderStarted,
    <List.Item
      id={course.id}
      title={course.name}
      accessories={isHidden ? [{ icon: Icon.EyeDisabled, tooltip: "Hidden from Assignments" }] : undefined}
      keywords={[course.section, course.room, ...(course.teachers?.map(({ name }) => name) ?? [])].filter(
        (k) => k !== undefined,
      )}
      detail={
        <List.Item.Detail
          isLoading={selected && teachersLoading}
          markdown={getCourseMarkdown(course)}
          metadata={
            <Metadata>
              <Metadata.TagList title="State">
                <Metadata.TagList.Item
                  text={isActive ? "Active" : "Archived"}
                  color={isActive ? Color.Green : Color.SecondaryText}
                />
              </Metadata.TagList>
              {isHidden && <Metadata.Label title="Assignments" text="Hidden" icon={Icon.EyeDisabled} />}
              {course.section && <Metadata.Label title="Section" text={course.section} />}
              {course.room && <Metadata.Label title="Room" text={course.room} />}
              {course.enrollmentCode && <Metadata.Label title="Class Code" text={course.enrollmentCode} />}
              {course.teachers?.map((teacher) => (
                <Metadata.Label
                  key={teacher.userId}
                  title={teacher.userId === course.ownerId ? "Owner" : "Teacher"}
                  text={teacher.name}
                  icon={teacher.photoUrl ? { source: teacher.photoUrl, mask: Image.Mask.Circle } : Icon.Person}
                />
              ))}
              <Metadata.Separator />
              <Metadata.Link title="Classroom" text="Open Course" target={withAuthUser(course.alternateLink)} />
              {course.teacherFolder?.alternateLink && (
                <Metadata.Link
                  title="Drive Folder"
                  text={course.teacherFolder.title ?? "Open Folder"}
                  target={withAuthUser(course.teacherFolder.alternateLink)}
                />
              )}
              {calendarLink && <Metadata.Link title="Calendar" text="Open Calendar" target={calendarLink} />}
              {course.courseGroupEmail && (
                <Metadata.Link
                  title="Course Group"
                  text={course.courseGroupEmail}
                  target={`mailto:${course.courseGroupEmail}`}
                />
              )}
              {course.teacherGroupEmail && (
                <Metadata.Link
                  title="Teachers Group"
                  text={course.teacherGroupEmail}
                  target={`mailto:${course.teacherGroupEmail}`}
                />
              )}
              <Metadata.Separator />
              <Metadata.Label title="Created" text={formatDateTime(new Date(course.creationTime))} />
              <Metadata.Label title="Updated" text={formatDateTime(new Date(course.updateTime))} />
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={course.name}>
          <Action.Push title="Show Posts" icon={Icon.List} target={<CourseStream course={course} />} />
          <Action.OpenInBrowser title="Open Course in Browser" url={withAuthUser(course.alternateLink)} />
          {/* Archived courses never contribute assignments */}
          {isActive && (
            <Action
              title={isHidden ? "Show in Assignments" : "Hide from Assignments"}
              icon={isHidden ? Icon.Eye : Icon.EyeDisabled}
              shortcut={{
                macOS: { modifiers: ["shift", "cmd"], key: "h" },
                Windows: { modifiers: ["shift", "ctrl"], key: "h" },
              }}
              onAction={() => onSetHidden(!isHidden)}
            />
          )}

          <ActionPanel.Section>
            {emails.length > 0 && (
              <Action.OpenInBrowser
                title={emails.length === 1 ? "Email Teacher" : "Email Teachers"}
                icon={Icon.Envelope}
                url={`mailto:${emails.join(",")}`}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
            )}
            {course.teacherFolder?.alternateLink && (
              <Action.OpenInBrowser
                title="Open Drive Folder"
                icon={Icon.Folder}
                url={withAuthUser(course.teacherFolder.alternateLink)}
              />
            )}
            {calendarLink && <Action.OpenInBrowser title="Open Calendar" icon={Icon.Calendar} url={calendarLink} />}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <RefreshAction onRefresh={refresh} />
            {settingsAction}
            <Action.CopyToClipboard
              title="Copy Course Link"
              content={course.alternateLink}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            <Action.CopyToClipboard
              title="Copy Course Name"
              content={course.name}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            {course.enrollmentCode && (
              <Action.CopyToClipboard title="Copy Class Code" content={course.enrollmentCode} />
            )}
            {emails.length > 0 && <Action.CopyToClipboard title="Copy Teacher Emails" content={emails.join(", ")} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />,
  );
}

function Command() {
  const [state, setState] = useCachedState<StateFilter>("course-filter", "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const settings = readSettings();
  const { hiddenIds, setHidden } = useHiddenCourses();
  const {
    data,
    issues,
    error,
    isLoading,
    refresh: refreshCourses,
  } = useClassroomQuery("courses", (options) => getCourses(options), [], true, "courses");
  useRenderReport("courses", data);
  const settingsAction = <SettingsAction />;
  const [searchText, setSearchText] = useState("");
  // Preserve teacher-name search, but don't fetch every roster just to open the list.
  const teacherSearch = useClassroomQuery(
    "courses-with-teachers",
    (options) => getCourses({ ...options, withTeachers: true }),
    [],
    settings.searchTeachers && !!searchText.trim(),
  );
  const refresh = () => {
    refreshCourses();
    if (settings.searchTeachers && searchText.trim()) teacherSearch.refresh();
  };
  const teachersByCourse = new Map(teacherSearch.data?.map((course) => [course.id, course.teachers]));

  const courses = data?.filter((course) => state === "all" || course.courseState === state) ?? [];
  const isSearching = !!searchText.trim();

  return (
    <List
      isLoading={isLoading || (settings.searchTeachers && !!searchText.trim() && teacherSearch.isLoading)}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      actions={
        <ActionPanel>
          <RefreshAction onRefresh={refresh} />
          {settingsAction}
        </ActionPanel>
      }
      // Kept while loading: switching to the split layout only once the rows arrive makes the window jump
      isShowingDetail={isLoading || courses.length > 0 || issues.length > 0}
      searchBarPlaceholder="Search courses"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Courses" value={state} onChange={(value) => setState(value as StateFilter)}>
          <List.Dropdown.Item title="All Courses" value="all" />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Active Courses" value="ACTIVE" />
            <List.Dropdown.Item title="Archived Courses" value="ARCHIVED" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && (
        <List.EmptyView
          title={getEmptyTitle("Courses", { error, isFiltered: isSearching || (state !== "all" && !!data?.length) })}
          description={error?.message}
          icon={error ? Icon.Warning : Icon.Book}
        />
      )}
      {SECTIONS.map(({ state, title }) => {
        const items = courses.filter((course) => course.courseState === state);
        return (
          // The count is of the whole section, which it no longer is once a search narrows it down
          <List.Section key={state} title={title} subtitle={isSearching ? undefined : String(items.length)}>
            {items.map((course) => (
              <CourseListItem
                key={course.id}
                course={{ ...course, teachers: teachersByCourse.get(course.id) }}
                selected={selectedId === course.id}
                isHidden={course.courseState === "ACTIVE" && !!hiddenIds?.includes(course.id)}
                onSetHidden={(hidden) => setHidden(course, hidden)}
                refreshCourses={refresh}
                settingsAction={settingsAction}
              />
            ))}
          </List.Section>
        );
      })}
      <IssuesSection issues={issues} onRefresh={refresh} />
    </List>
  );
}

export default withGoogleAuth(Command);
