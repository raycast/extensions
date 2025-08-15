import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback } from "react";
import { useDataLoading } from "./utils/data-loading";
import { assignmentsCache } from "./utils/cache";
import { AssignmentProcessor, CourseAssignments } from "./utils/assignment-utils";
import { CommonActionPanel } from "./components/common/ActionPanel";
import { ErrorView } from "./components/common/ErrorView";
import CanvasAPI from "./canvas-api";

export default function Command() {
  // Create a stable reference to the load function
  const loadAssignmentsData = useCallback(async (): Promise<CourseAssignments[]> => {
    const api = new CanvasAPI();
    const courses = await api.getCourses();
    const assignmentsData: CourseAssignments[] = [];

    for (const course of courses) {
      try {
        const assignments = await api.getAssignments(course.id);
        const processed = AssignmentProcessor.processCourseAssignments(course, assignments);
        assignmentsData.push(processed);
      } catch (error) {
        console.warn(`Failed to load assignments for course ${course.name}:`, error);
        // Add course with no assignment data
        assignmentsData.push({
          course,
          nextDue: null,
          lastCompleted: null,
        });
      }
    }

    return assignmentsData;
  }, []);

  const {
    data: courseAssignments,
    isLoading,
    error,
    refreshData,
    clearCache,
  } = useDataLoading<CourseAssignments[]>([], {
    cacheKey: "canvas_assignments",
    cache: assignmentsCache,
    loadFunction: loadAssignmentsData,
    showCacheToast: true,
    showRefreshToast: true,
  });

  if (error) {
    return <ErrorView error={error} title="Configuration Error" />;
  }

  return (
    <List isLoading={isLoading} actions={<CommonActionPanel onRefresh={refreshData} onClearCache={clearCache} />}>
      <List.Section title="⏰ Next Due Assignments" subtitle="Upcoming work">
        {courseAssignments
          .filter((ca) => ca.nextDue)
          .map((courseData) => (
            <List.Item
              key={`next-${courseData.course.id}`}
              title={courseData.nextDue!.name}
              subtitle={`${courseData.course.name} • ${AssignmentProcessor.formatDueDate(courseData.nextDue!.due_at)}`}
              accessories={[
                { text: `${courseData.nextDue!.points_possible} points` },
                { date: new Date(courseData.nextDue!.due_at) },
              ]}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Assignment"
                    url={new CanvasAPI().getAssignmentUrl(courseData.nextDue!.id)}
                  />
                  <Action.OpenInBrowser title="Open Course" url={new CanvasAPI().getCourseUrl(courseData.course.id)} />
                  <Action.CopyToClipboard
                    title="Copy Assignment Info"
                    content={`${courseData.nextDue!.name} - ${courseData.course.name} - ${AssignmentProcessor.formatDueDate(courseData.nextDue!.due_at)}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        {courseAssignments.filter((ca) => ca.nextDue).length === 0 && (
          <List.Item title="No upcoming assignments" subtitle="All caught up!" icon={Icon.Checkmark} />
        )}
      </List.Section>

      <List.Section title="✅ Recently Completed" subtitle="Last submissions">
        {courseAssignments
          .filter((ca) => ca.lastCompleted)
          .map((courseData) => (
            <List.Item
              key={`completed-${courseData.course.id}`}
              title={courseData.lastCompleted!.name}
              subtitle={`${courseData.course.name} • Submitted: ${new Date(courseData.lastCompleted!.submission!.submitted_at!).toLocaleDateString()}`}
              accessories={[
                { text: `${courseData.lastCompleted!.points_possible} points` },
                { date: new Date(courseData.lastCompleted!.submission!.submitted_at!) },
              ]}
              icon={Icon.Checkmark}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Assignment"
                    url={new CanvasAPI().getAssignmentUrl(courseData.lastCompleted!.id)}
                  />
                  <Action.OpenInBrowser title="Open Course" url={new CanvasAPI().getCourseUrl(courseData.course.id)} />
                  <Action.CopyToClipboard
                    title="Copy Assignment Info"
                    content={`${courseData.lastCompleted!.name} - ${courseData.course.name} - Submitted: ${new Date(courseData.lastCompleted!.submission!.submitted_at!).toLocaleDateString()}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        {courseAssignments.filter((ca) => ca.lastCompleted).length === 0 && (
          <List.Item
            title="No completed assignments yet"
            subtitle="Start working on your first assignment"
            icon={Icon.Info}
          />
        )}
      </List.Section>

      <List.Section title="📊 Assignment Statistics" subtitle="Workload overview by course">
        {courseAssignments.map((courseData) => {
          const hasNextDue = courseData.nextDue !== null;
          const hasCompleted = courseData.lastCompleted !== null;
          const status = hasNextDue ? "🟡 Has upcoming work" : "🟢 All caught up";

          return (
            <List.Item
              key={courseData.course.id}
              title={`${courseData.course.name} →`}
              subtitle={`${courseData.course.course_code} • ${status} • Press Enter to view assignments`}
              accessories={[
                { text: hasNextDue ? "⏰ Due soon" : "✅ Up to date" },
                { text: hasCompleted ? "📝 Has submissions" : "🆕 No submissions yet" },
              ]}
              icon={hasNextDue ? Icon.Clock : Icon.Checkmark}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Course Assignments"
                    url={new CanvasAPI().getCourseAssignmentsUrl(courseData.course.id)}
                  />
                  <Action.OpenInBrowser title="Open Course" url={new CanvasAPI().getCourseUrl(courseData.course.id)} />
                  <Action.CopyToClipboard
                    title="Copy Course Stats"
                    content={`${courseData.course.name}: ${status}${hasNextDue ? ` - Next due: ${courseData.nextDue!.name}` : ""}${hasCompleted ? ` - Last completed: ${courseData.lastCompleted!.name}` : ""}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
