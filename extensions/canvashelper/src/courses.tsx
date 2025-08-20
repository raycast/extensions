import { ActionPanel, Action, List, Icon, Form } from "@raycast/api";
import { useState, useCallback } from "react";
import { useDataLoading } from "./utils/data-loading";
import { coursesCache } from "./utils/cache";
import { CommonActionPanel } from "./components/common/ActionPanel";
import { ErrorView } from "./components/common/ErrorView";
import CanvasAPI, { Course } from "./canvas-api";

interface CourseNicknameFormProps {
  courseId: number;
  currentName: string;
  onSetNickname: (courseId: number, currentName: string, nickname: string) => Promise<void>;
}

function CourseNicknameForm({ courseId, currentName, onSetNickname }: CourseNicknameFormProps) {
  const [nickname, setNickname] = useState(currentName);

  async function handleSubmit(values: { nickname: string }) {
    await onSetNickname(courseId, currentName, values.nickname);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Course Nickname" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nickname"
        title="Course Nickname"
        placeholder="Enter course nickname"
        value={nickname}
        onChange={setNickname}
      />
      <Form.Description text={`Current name: "${currentName}"`} />
      <Form.Description text="This sets a personal nickname for the course that only you can see." />
    </Form>
  );
}

export default function Command() {
  // Create a stable reference to the load function
  const loadCourses = useCallback(async () => {
    const api = new CanvasAPI();
    return await api.getCourses();
  }, []);

  const {
    data: courses,
    isLoading,
    error,
    refreshData,
    clearCache,
  } = useDataLoading<Course[]>([], {
    cacheKey: "canvas_courses",
    cache: coursesCache,
    loadFunction: loadCourses,
    showCacheToast: true,
    showRefreshToast: true,
  });

  async function setCourseNickname(courseId: number, currentName: string, nickname: string) {
    try {
      const api = new CanvasAPI();
      await api.setCourseNickname(courseId, nickname);

      // Refresh the data to show the updated nickname
      await refreshData();
    } catch (err) {
      console.error("Failed to set course nickname:", err);
    }
  }

  if (error) {
    return <ErrorView error={error} title="Configuration Error" />;
  }

  return (
    <List isLoading={isLoading} actions={<CommonActionPanel onRefresh={refreshData} onClearCache={clearCache} />}>
      <List.Section title="📚 My Courses" subtitle={`${courses.length} active courses`}>
        {courses.map((course) => (
          <List.Item
            key={course.id}
            title={course.name}
            subtitle={course.course_code}
            accessories={[{ text: course.enrollment_state }, { date: new Date(course.start_at) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Course Home" url={new CanvasAPI().getCourseUrl(course.id)} />
                <Action.OpenInBrowser
                  title="Open Modules"
                  url={new CanvasAPI().getCourseModulesUrl(course.id)}
                  icon={Icon.List}
                />
                <Action.OpenInBrowser
                  title="Open Assignments"
                  url={new CanvasAPI().getCourseAssignmentsUrl(course.id)}
                  icon={Icon.Document}
                />
                <Action.OpenInBrowser
                  title="Open Grades"
                  url={new CanvasAPI().getCourseGradesUrl(course.id)}
                  icon={Icon.Star}
                />
                <Action.OpenInBrowser
                  title="Open Files"
                  url={new CanvasAPI().getCourseFilesUrl(course.id)}
                  icon={Icon.Folder}
                />
                <Action.CopyToClipboard title="Copy Course Code" content={course.course_code} />
                <Action.Push
                  title="Set Course Nickname"
                  icon={Icon.Pencil}
                  target={
                    <CourseNicknameForm
                      courseId={course.id}
                      currentName={course.name}
                      onSetNickname={setCourseNickname}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
