import { getPreferenceValues, List, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { addDays, format, isToday, isTomorrow, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { useSync } from "./hooks/useSync";
import { TaskItem } from "./components/TaskItem";
import { ASTaskItem } from "./components/ASTaskItem";
import { Task } from "./types/ticktick";
import { useState, useEffect, useCallback } from "react";
import { getNext7Days, ASSection } from "./lib/applescript";
import { useFirstRun } from "./lib/useFirstRun";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

// --- Shared helpers ---

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function getTaskDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  try {
    return parseISO(task.dueDate);
  } catch {
    return null;
  }
}

// --- API mode ---

function Next7DaysAPI() {
  useFirstRun();
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));
  const today = startOfDay(new Date());
  const end = addDays(today, 7);

  const upcoming = data.tasks
    .filter((t) => {
      const d = getTaskDate(t);
      if (!d) return false;
      return isWithinInterval(startOfDay(d), { start: today, end });
    })
    .sort((a, b) => (getTaskDate(a)?.getTime() ?? 0) - (getTaskDate(b)?.getTime() ?? 0));

  const grouped = new Map<string, Task[]>();
  for (const task of upcoming) {
    const key = format(getTaskDate(task)!, "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  return (
    <List isLoading={isLoading} navigationTitle="Next 7 Days" searchBarPlaceholder="Filter upcoming tasks...">
      {upcoming.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Calendar} title="Nothing upcoming" description="No tasks in the next 7 days." />
      ) : (
        Array.from(grouped.entries()).map(([dateKey, tasks]) => (
          <List.Section
            key={dateKey}
            title={getDayLabel(parseISO(dateKey))}
            subtitle={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          >
            {tasks.map((task) => (
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
        ))
      )}
    </List>
  );
}

// --- AppleScript mode ---

function Next7DaysAppleScript() {
  useFirstRun();
  const [sections, setSections] = useState<ASSection[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setIsLoading(true);
    getNext7Days().then((s) => {
      setSections(s);
      setIsLoading(false);
    });
  }, [refreshKey]);

  const allTasks = sections?.flatMap((s) => s.children) ?? [];

  return (
    <List isLoading={isLoading} navigationTitle="Next 7 Days" searchBarPlaceholder="Filter upcoming tasks...">
      {!isLoading && allTasks.length === 0 ? (
        <List.EmptyView icon={Icon.Calendar} title="Nothing upcoming" description="No tasks in the next 7 days." />
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

export default integrationMode === "applescript" ? Next7DaysAppleScript : withAccessToken({ authorize })(Next7DaysAPI);
