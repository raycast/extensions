import { getPreferenceValues, List, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { format, isToday, parseISO } from "date-fns";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { ASTaskItem } from "./components/ASTaskItem";
import { Task } from "./types/ticktick";
import { useState, useEffect, useCallback } from "react";
import { getToday, ASSection } from "./lib/applescript";
import { useFirstRun } from "./lib/useFirstRun";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

// --- API mode ---

function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  try {
    return isToday(parseISO(task.dueDate));
  } catch {
    return false;
  }
}

function TodayAPI() {
  useFirstRun();
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const todayTasks = data.tasks.filter(isTaskDueToday);
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));
  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <List isLoading={isLoading} navigationTitle={`Today — ${today}`} searchBarPlaceholder="Filter today's tasks...">
      {todayTasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="All done for today!" description="No tasks due today." />
      ) : (
        <List.Section title={`Today · ${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""}`}>
          {todayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={data.projects}
              projectName={projectMap.get(task.projectId)}
              onComplete={revalidate}
              onDelete={revalidate}
              onRevalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// --- AppleScript mode ---

function TodayAppleScript() {
  useFirstRun();
  const [sections, setSections] = useState<ASSection[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const today = format(new Date(), "EEEE, MMMM d");

  useEffect(() => {
    setIsLoading(true);
    getToday().then((s) => {
      setSections(s);
      setIsLoading(false);
    });
  }, [refreshKey]);

  const allTasks = sections?.flatMap((s) => s.children) ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={`Today — ${today}`} searchBarPlaceholder="Filter today's tasks...">
      {!isLoading && allTasks.length === 0 ? (
        <List.EmptyView icon={Icon.Checkmark} title="All done for today!" description="No tasks due today." />
      ) : (
        sections?.map((section) => (
          <List.Section
            key={section.id}
            title={section.name}
            subtitle={`${section.children.length} task${section.children.length !== 1 ? "s" : ""}`}
          >
            {section.children.map((task) => (
              <ASTaskItem key={task.id} task={task} onRefresh={refresh} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

export default integrationMode === "applescript" ? TodayAppleScript : withAccessToken({ authorize })(TodayAPI);
