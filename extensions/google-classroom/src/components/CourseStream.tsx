import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useClassroomQuery } from "../hooks/useClassroomQuery";
import { useNow } from "../hooks/useNow";
import RefreshAction from "./RefreshAction";
import { useState } from "react";
import { Course, StreamItemType, getCourseStream, getTeachers } from "../api/classroom";
import { withAuthUser } from "../api/googleAuth";
import { TYPE_INFO, getEmptyTitle, truncate } from "../helpers/formatters";
import IssuesSection from "./IssuesSection";
import StreamListItem from "./StreamListItem";

const TYPES: StreamItemType[] = ["announcement", "assignment", "question", "material"];

export default function CourseStream({ course }: { course: Course }) {
  useNow();
  const [type, setType] = useState<StreamItemType | "all">("all");
  const [searchText, setSearchText] = useState("");
  const { data, issues, error, isLoading, refresh } = useClassroomQuery(
    "stream",
    (options) => getCourseStream(course.id, options),
    [course.id],
  );
  // The course comes without its teachers when opened from the assignments, or before they finished loading.
  // They only name who posted, so failing to load them isn't worth an error.
  const { data: teachers } = useClassroomQuery(
    "teachers",
    async (options) => (await getTeachers(course.id, options).catch(() => undefined)) ?? null,
    [course.id],
    !course.teachers,
  );
  course = { ...course, teachers: course.teachers ?? teachers ?? undefined };

  const items = data?.items.filter((item) => type === "all" || item.type === type);

  return (
    <List
      isLoading={isLoading}
      filtering
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <RefreshAction onRefresh={refresh} />
        </ActionPanel>
      }
      // Kept while loading: switching to the split layout only once the rows arrive makes the window jump
      isShowingDetail={isLoading || !!items?.length || issues.length > 0}
      navigationTitle={truncate(course.name, 40)}
      searchBarPlaceholder="Search posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" onChange={(value) => setType(value as StreamItemType | "all")}>
          <List.Dropdown.Item title="All Posts" value="all" icon={Icon.Tray} />
          <List.Dropdown.Section>
            {TYPES.map((value) => (
              <List.Dropdown.Item
                key={value}
                title={TYPE_INFO[value].plural}
                value={value}
                icon={TYPE_INFO[value].icon}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && (
        <List.EmptyView
          title={getEmptyTitle("Posts", {
            error,
            isFiltered: !!searchText.trim() || (type !== "all" && !!data?.items.length),
          })}
          description={error?.message}
          icon={error ? Icon.Warning : Icon.Tray}
        />
      )}
      {items?.map((item) => (
        <StreamListItem
          key={`${item.type}-${item.id}`}
          item={item}
          onRefresh={refresh}
          course={course}
          topic={item.topicId ? data?.topics[item.topicId] : undefined}
          courseAction={
            <Action.OpenInBrowser title="Open Course in Browser" url={withAuthUser(course.alternateLink)} />
          }
        />
      ))}
      <IssuesSection issues={issues} onRefresh={refresh} />
    </List>
  );
}
