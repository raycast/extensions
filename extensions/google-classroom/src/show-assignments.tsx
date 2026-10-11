import { useRenderReport } from "./helpers/profiling";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { AssignmentFilter, getAssignments } from "./api/classroom";
import CourseStream from "./components/CourseStream";
import IssuesSection from "./components/IssuesSection";
import StreamListItem from "./components/StreamListItem";
import { withGoogleAuth } from "./components/withGoogleAuth";
import { getEmptyTitle } from "./helpers/formatters";

import { useClassroomQuery } from "./hooks/useClassroomQuery";
import { useNow } from "./hooks/useNow";
import RefreshAction from "./components/RefreshAction";

import { useHiddenCourses } from "./settings/hiddenCourses";
import { readSettings } from "./settings/useSettings";
import { assignmentSections } from "./settings/model";
import { SettingsAction } from "./components/SettingsAction";

const FILTERS: { value: AssignmentFilter; title: string; icon: Icon }[] = [
  { value: "missing", title: "Missing", icon: Icon.ExclamationMark },
  { value: "dueSoon", title: "Due Soon", icon: Icon.Alarm },
  { value: "due", title: "Due", icon: Icon.Calendar },
  { value: "noDueDate", title: "No Due Date", icon: Icon.CircleDisabled },
  { value: "done", title: "Done", icon: Icon.CheckCircle },
];

function Command() {
  const [filter, setFilter] = useCachedState<AssignmentFilter>("assignment-filter", "all");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("assignment-detail", true);
  const [searchText, setSearchText] = useState("");
  const now = useNow();
  const settings = readSettings();
  const { hiddenIds, setHidden } = useHiddenCourses();
  const {
    data: loaded,
    issues,
    error,
    isLoading,
    refresh,
  } = useClassroomQuery(
    "assignments",
    // Hiding a course filters it out below, there is nothing to reload for it
    (options) => getAssignments({ ...options, hiddenCourseIds: hiddenIds }),
    [],
    !!hiddenIds,
    "assignments",
  );
  // A course disappears the moment it's hidden, without waiting for the list to reload
  const data = loaded?.filter((assignment) => !hiddenIds?.includes(assignment.courseId));
  useRenderReport("assignments", data);
  const sections = assignmentSections(data ?? [], filter, settings, now);
  const everythingHidden = !!hiddenIds?.length && !!loaded && !data?.length && issues.length === 0;
  const isSearching = !!searchText.trim();
  const extraActions = (
    <>
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{
          macOS: { modifiers: ["shift", "cmd"], key: "i" },
          Windows: { modifiers: ["shift", "ctrl"], key: "i" },
        }}
        onAction={() => setIsShowingDetail(!isShowingDetail)}
      />
      <SettingsAction />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      // The order of the groups is the user's, searching shouldn't reshuffle it
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <RefreshAction onRefresh={refresh} />
          <SettingsAction />
        </ActionPanel>
      }
      // Kept while loading: switching to the split layout only once the rows arrive makes the window jump
      isShowingDetail={isShowingDetail && (isLoading || !hiddenIds || sections.length > 0 || issues.length > 0)}
      searchBarPlaceholder="Search assignments"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Assignments"
          value={filter}
          onChange={(value) => setFilter(value as AssignmentFilter)}
        >
          <List.Dropdown.Item title="All Assignments" value="all" />
          <List.Dropdown.Section>
            {FILTERS.map(({ value, title }) => (
              <List.Dropdown.Item key={value} title={title} value={value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && hiddenIds && (
        <List.EmptyView
          title={getEmptyTitle("Assignments", {
            error,
            isFiltered: isSearching || (filter !== "all" && !!data?.length),
          })}
          description={
            error?.message ??
            (everythingHidden && !isSearching && filter === "all"
              ? "Some courses are hidden from your assignments. Show them again from Show Courses."
              : undefined)
          }
          icon={error ? Icon.Warning : Icon.CheckCircle}
        />
      )}
      {sections.map(({ key, title, items }) => {
        return (
          // The count is of the whole group, which it no longer is once a search narrows it down
          <List.Section key={key} title={title} subtitle={title && !isSearching ? String(items.length) : undefined}>
            {items.map((assignment) => (
              <StreamListItem
                key={`${assignment.courseId}-${assignment.id}`}
                item={assignment}
                showIcon={false}
                isShowingDetail={isShowingDetail}
                extraActions={
                  <>
                    <Action
                      title="Hide Course from Assignments"
                      icon={Icon.EyeDisabled}
                      shortcut={{
                        macOS: { modifiers: ["shift", "cmd"], key: "h" },
                        Windows: { modifiers: ["shift", "ctrl"], key: "h" },
                      }}
                      onAction={() => setHidden(assignment.course, true)}
                    />
                    {extraActions}
                  </>
                }
                onRefresh={refresh}
                course={assignment.course}
                courseAction={
                  <Action.Push
                    title="Open Course"
                    icon={Icon.Book}
                    target={<CourseStream course={assignment.course} />}
                  />
                }
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
