import { List, Toast, showToast, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { ACHIEVEMENT_QUOTES } from "./constants/quotes";

interface Preferences {
  todoistApiToken: string;
  pointsKeyword: string;
  enableDailyPointsTarget: boolean;
  dailyPointsTarget: string;
  enableDailyTaskTarget: boolean;
  dailyTaskTarget: string;
}

interface Task {
  id: string;
  content: string;
  completed_at: string;
  project_id: string;
  priority: number;
  user_id: string;
  labels: string[];
}

interface Project {
  id: string;
  name: string;
}

interface TodoistResponse {
  items: Task[];
  next_cursor?: string;
}

interface TasksByProject {
  [projectId: string]: {
    projectName: string;
    tasks: Task[];
  };
}

interface SyncResponse {
  user: {
    id: string;
  };
}

const getPriorityIcon = (priority: number) => {
  switch (priority) {
    case 4:
      return { source: { light: "priority-1.png", dark: "priority-1.png" } };
    case 3:
      return { source: { light: "priority-2.png", dark: "priority-2.png" } };
    case 2:
      return { source: { light: "priority-3.png", dark: "priority-3.png" } };
    default:
      return { source: { light: "priority-4.png", dark: "priority-4.png" } };
  }
};

// Helper function to extract points from labels
const getPoints = (labels: string[], keyword: string): number | null => {
  const pointsLabel = labels.find((label) => label.startsWith(keyword));
  if (!pointsLabel) return null;

  const pointsStr = pointsLabel.substring(keyword.length).trim();
  const points = Number(pointsStr);

  return !isNaN(points) && points > 0 ? points : null;
};

export default function Command() {
  const [tasksByProject, setTasksByProject] = useState<TasksByProject>({});
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  // Calculate total points for a list of tasks
  const calculateTotalPoints = (tasks: Task[]): number => {
    return tasks.reduce((total, task) => {
      const points = getPoints(task.labels, preferences.pointsKeyword);
      return total + (points || 0);
    }, 0);
  };

  useEffect(() => {
    async function fetchUserId() {
      const response = await fetch("https://api.todoist.com/api/v1/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.todoistApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sync_token: "*",
          resource_types: ["user"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = (await response.json()) as SyncResponse;
      return data.user.id;
    }

    async function fetchProjectDetails(projectId: string): Promise<Project> {
      const response = await fetch(`https://api.todoist.com/api/v1/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${preferences.todoistApiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project details for project ${projectId}`);
      }

      return response.json() as Promise<Project>;
    }

    async function fetchCompletedTasksPage(cursor?: string): Promise<TodoistResponse> {
      // Get today's date at midnight
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const sinceStr = since.toISOString().split("T")[0];

      // Get tomorrow's date at midnight
      const until = new Date();
      until.setDate(until.getDate() + 1);
      until.setHours(0, 0, 0, 0);
      const untilStr = until.toISOString().split("T")[0];

      const url = new URL("https://api.todoist.com/api/v1/tasks/completed/by_completion_date");
      url.searchParams.append("since", sinceStr);
      url.searchParams.append("until", untilStr);
      url.searchParams.append("limit", "50");
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${preferences.todoistApiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      return response.json() as Promise<TodoistResponse>;
    }

    async function fetchAllCompletedTasks(): Promise<Task[]> {
      const allTasks: Task[] = [];
      let cursor: string | undefined;

      do {
        const response = await fetchCompletedTasksPage(cursor);
        allTasks.push(...response.items);
        cursor = response.next_cursor;
      } while (cursor);

      return allTasks;
    }

    async function fetchCompletedTasks() {
      try {
        const currentUserId = await fetchUserId();

        const allTasks = await fetchAllCompletedTasks();

        const userTasks = allTasks.filter((task) => task.user_id === currentUserId);

        const projectIds = [...new Set(userTasks.map((task) => task.project_id))];

        const projectDetails = await Promise.all(
          projectIds.map(async (projectId) => {
            try {
              return await fetchProjectDetails(projectId);
            } catch (error) {
              console.error(`Failed to fetch project ${projectId}:`, error);
              return { id: projectId, name: "Unknown Project" };
            }
          }),
        );

        const projectMap = Object.fromEntries(projectDetails.map((project) => [project.id, project.name]));

        const grouped = userTasks.reduce<TasksByProject>((acc, task) => {
          const projectId = task.project_id;
          if (!acc[projectId]) {
            acc[projectId] = {
              projectName: projectMap[projectId] || "Unknown Project",
              tasks: [],
            };
          }
          acc[projectId].tasks.push(task);
          return acc;
        }, {});

        Object.values(grouped).forEach((project) => {
          project.tasks.sort((a, b) => b.priority - a.priority);
        });

        setTasksByProject(grouped);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch tasks",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompletedTasks();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Daily Completed Tasks"
      searchBarPlaceholder="Search completed tasks..."
    >
      <List.Section title="🎯 Daily Summary">
        {(() => {
          const totalTasks = Object.values(tasksByProject).reduce((total, project) => total + project.tasks.length, 0);
          const totalPoints = Object.values(tasksByProject).reduce(
            (total, project) => total + calculateTotalPoints(project.tasks),
            0,
          );

          const showTaskTarget = preferences.enableDailyTaskTarget === true;
          const taskTarget = showTaskTarget ? parseInt(preferences.dailyTaskTarget || "0", 10) : 0;

          const showPointsTarget = preferences.enableDailyPointsTarget === true;
          const pointsTarget = showPointsTarget ? parseInt(preferences.dailyPointsTarget || "0", 10) : 0;

          const taskTargetMet = showTaskTarget && taskTarget > 0 && totalTasks >= taskTarget;
          const pointsTargetMet = showPointsTarget && pointsTarget > 0 && totalPoints >= pointsTarget;
          const allTargetsMet = (showTaskTarget ? taskTargetMet : true) && (showPointsTarget ? pointsTargetMet : true);

          const randomQuote = ACHIEVEMENT_QUOTES[Math.floor(Math.random() * ACHIEVEMENT_QUOTES.length)];

          return (
            <>
              <List.Item
                title={
                  showTaskTarget
                    ? `${totalTasks}/${taskTarget} tasks completed today`
                    : `${totalTasks} tasks completed today`
                }
                icon={
                  showTaskTarget
                    ? {
                        source: taskTargetMet ? Icon.CheckCircle : Icon.Circle,
                        tintColor: taskTargetMet ? Color.Blue : undefined,
                      }
                    : Icon.Dot
                }
                accessories={
                  showTaskTarget
                    ? [
                        {
                          text:
                            taskTarget > 0
                              ? `${Math.round((totalTasks / taskTarget) * 100)}% of daily target`
                              : "No target set",
                          tooltip: "Progress towards daily task target",
                          icon: taskTargetMet ? { source: Icon.Dot, tintColor: Color.Blue } : undefined,
                        },
                      ]
                    : []
                }
              />
              {showPointsTarget && (
                <List.Item
                  title={`${totalPoints}/${pointsTarget} points completed`}
                  icon={{
                    source: pointsTargetMet ? Icon.CheckCircle : Icon.Circle,
                    tintColor: pointsTargetMet ? Color.Blue : undefined,
                  }}
                  accessories={[
                    {
                      text:
                        pointsTarget > 0
                          ? `${Math.round((totalPoints / pointsTarget) * 100)}% of daily target`
                          : "No target set",
                      tooltip: "Progress towards daily points target",
                      icon: pointsTargetMet ? { source: Icon.Dot, tintColor: Color.Blue } : undefined,
                    },
                  ]}
                />
              )}
              {allTargetsMet && (showTaskTarget || showPointsTarget) && (
                <List.Item
                  title={`${randomQuote.text} — ${randomQuote.author}`}
                  icon={{
                    source: Icon.QuoteBlock,
                    tintColor: Color.Yellow,
                  }}
                />
              )}
            </>
          );
        })()}
      </List.Section>

      {Object.entries(tasksByProject).map(([projectId, { projectName, tasks }]) => {
        const projectPoints = preferences.enableDailyPointsTarget ? calculateTotalPoints(tasks) : 0;
        return (
          <List.Section
            key={projectId}
            title={`${projectName} (${tasks.length} tasks${projectPoints > 0 ? ` | ${projectPoints} points` : ""})`}
          >
            {tasks.map((task) => {
              const points = preferences.enableDailyPointsTarget
                ? getPoints(task.labels, preferences.pointsKeyword)
                : null;
              return (
                <List.Item
                  key={task.id}
                  title={task.content}
                  icon={getPriorityIcon(task.priority)}
                  accessories={
                    points !== null
                      ? [
                          {
                            text: `${points} points`,
                            tooltip: "Points",
                          },
                        ]
                      : []
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Browser" url={`https://todoist.com/app/task/${task.id}`} />
                      <Action.Open
                        title="Open in Todoist App"
                        target={`todoist://task?id=${task.id}`}
                        application="Todoist"
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
