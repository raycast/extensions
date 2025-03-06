import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { clearLogs, getGroupedWorklog } from "../utils";
import { Day } from "../types";
import { getTaskTypeLabel } from "./helpers/task-icons";

export default function Command() {
  const [days, setDays] = useState<Day[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadWorklog();
  }, []);

  async function loadWorklog() {
    try {
      setIsLoading(true);
      const groupedWorklog = await getGroupedWorklog();
      setDays(groupedWorklog);

      if (groupedWorklog.length > 0) {
        const firstDay = groupedWorklog[0];
        setSelectedDayId(firstDay.date);

        const firstProjectIds = Object.keys(firstDay.projects);
        if (firstProjectIds.length > 0) {
          setSelectedProjectId(firstProjectIds[0]);
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "Worklog Loaded",
        message: "Worklog data loaded successfully",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load worklog",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle clearing all logs
  const handleClearLogs = async () => {
    const options: Alert.Options = {
      title: "Clear All Worklogs",
      message: "Are you sure you want to clear all worklog data? This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    };

    const confirmed = await confirmAlert(options);
    if (confirmed) {
      try {
        await clearLogs();
        showToast({
          style: Toast.Style.Success,
          title: "Worklogs Cleared",
          message: "All worklog data has been cleared successfully",
        });
        setDays([]);
        setSelectedDayId(null);
        setSelectedProjectId(null);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Clear Logs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worklogs..."
      navigationTitle="Manage Worklogs"
      selectedItemId={selectedDayId && selectedProjectId ? `${selectedDayId}-${selectedProjectId}` : undefined}
      onSelectionChange={(id) => {
        if (id && id.includes("-")) {
          const [dayId, projectId] = id.split("-");
          setSelectedDayId(dayId);
          setSelectedProjectId(projectId);
        }
      }}
      isShowingDetail
      throttle
    >
      <List.EmptyView
        title="No Worklogs Found"
        description="You don't have any work logs yet. Start a session to begin tracking your work."
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Start a Session"
              url="raycast://extensions/aliarthur/wabix-worklogs/start-session"
            />
          </ActionPanel>
        }
      />

      {days.map((day, index) => (
        <List.Section key={index} title={day.date}>
          {Object.entries(day.projects).map(([projectId, project]) => (
            <List.Item
              key={`${day.date}-${projectId}`}
              id={`${day.date}-${projectId}`}
              title={project.projectName}
              icon={Icon.Box}
              accessories={[
                {
                  text: `${project.totalDecimalHours}h`,
                  icon: Icon.Clock,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`
# ${project.projectName}
**${day.date} · ${project.totalDecimalHours}h total**

${project.tasks
  .map((task) => {
    const startTime = new Date(task.startTime);
    const formattedTime = `${startTime.getHours().toString().padStart(2, "0")}:${startTime.getMinutes().toString().padStart(2, "0")}`;

    return `---

### ${getTaskTypeLabel(task.type)}
${task.description || "No description"}


⏱️ ${formattedTime}  ⌛ ${task.decimalHours}h  ${task.githubUrl ? `🔗 [Commit](${task.githubUrl})` : ""}`;
  })
  .join("\n\n")}
`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Worklogs"
                    icon={Icon.RotateClockwise}
                    onAction={loadWorklog}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Clear All Worklogs"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearLogs}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
