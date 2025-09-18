import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback } from "react";
import { useDataLoading } from "./utils/data-loading";
import { gradesCache } from "./utils/cache";
import { GradeProcessor } from "./utils/grade-utils";
import { CommonActionPanel } from "./components/common/ActionPanel";
import { ErrorView } from "./components/common/ErrorView";
import CanvasAPI, { Grade } from "./canvas-api";

export default function Command() {
  // Create a stable reference to the load function
  const loadGrades = useCallback(async () => {
    const api = new CanvasAPI();
    return await api.getGrades();
  }, []);

  const {
    data: grades,
    isLoading,
    error,
    refreshData,
    clearCache,
  } = useDataLoading<Grade[]>([], {
    cacheKey: "canvas_grades",
    cache: gradesCache,
    loadFunction: loadGrades,
    showCacheToast: true,
    showRefreshToast: true,
  });

  if (error) {
    return <ErrorView error={error} title="Configuration Error" />;
  }

  return (
    <List isLoading={isLoading} actions={<CommonActionPanel onRefresh={refreshData} onClearCache={clearCache} />}>
      <List.Section title="📊 Course Grades" subtitle={`${grades.length} courses with grades`}>
        {grades.length > 0 ? (
          grades.map((grade) => (
            <List.Item
              key={grade.id}
              title={grade.course_name}
              subtitle={GradeProcessor.getGradeDescription(grade)}
              accessories={[{ text: GradeProcessor.formatGrade(grade) }, { text: "Course Grade" }]}
              icon={GradeProcessor.getGradeIcon(grade.grade)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Course" url={new CanvasAPI().getCourseGradesUrl(grade.course_id)} />
                  <Action.CopyToClipboard
                    title="Copy Grade"
                    content={`${grade.course_name}: ${GradeProcessor.formatGrade(grade)}`}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item
            title="No grades available yet"
            subtitle="Grades will appear here as they become available"
            icon={Icon.Info}
          />
        )}
      </List.Section>
    </List>
  );
}
