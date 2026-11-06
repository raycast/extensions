import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useState } from "react";
import { AssignmentList } from "./components/assignment-list";
import { ErrorState } from "./components/error-state";
import { ClassroomApi, classroomLink, Course } from "./lib/api";
import { accessToken, isStudent } from "./lib/auth";
import { usePromise } from "@raycast/utils";

function CourseWork({ course }: { course: Course }) {
  const {
    data,
    error,
    isLoading,
    revalidate: refresh,
  } = usePromise(
    async (course: Course) =>
      new ClassroomApi(await accessToken()).courseworkWithStatus(
        course,
        isStudent(),
      ),
    [course],
    { onError: () => undefined },
  );
  return (
    <AssignmentList
      title={course.name}
      items={data ?? []}
      isLoading={isLoading}
      refresh={refresh}
      errorView={
        error ? (
          <ErrorState message={error.message} refresh={refresh} />
        ) : undefined
      }
    />
  );
}

export default function Courses() {
  const [state, setState] = useState("ACTIVE");
  const {
    data,
    error,
    isLoading,
    revalidate: refresh,
  } = usePromise(
    async (state: string) =>
      new ClassroomApi(await accessToken()).courses(state),
    [state],
    { onError: () => undefined },
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search your courses…"
      searchBarAccessory={
        <List.Dropdown tooltip="Course State" onChange={setState}>
          <List.Dropdown.Item title="Active" value="ACTIVE" />
          <List.Dropdown.Item title="Archived" value="ARCHIVED" />
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorState message={error.message} refresh={refresh} />
      ) : (
        <List.EmptyView
          title="No Courses"
          description="Your account has no courses in this state."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      )}
      {(data ?? []).map((course) => {
        const url = classroomLink(course.alternateLink);
        return (
          <List.Item
            key={course.id}
            title={course.name}
            subtitle={course.section}
            icon={Icon.Book}
            keywords={[course.room ?? "", course.description ?? ""]}
            detail={
              <List.Item.Detail
                markdown={
                  course.description || "No course description provided."
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Section"
                      text={course.section ?? "None"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Room"
                      text={course.room ?? "None"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="State"
                      text={course.courseState ?? state}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Coursework"
                  icon={Icon.Document}
                  target={<CourseWork course={course} />}
                />
                {url && (
                  <Action.OpenInBrowser
                    title="Open Course in Classroom"
                    url={url}
                  />
                )}
                {url && (
                  <Action.CopyToClipboard
                    title="Copy Course Link"
                    content={url}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
