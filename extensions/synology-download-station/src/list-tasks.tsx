import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast, Clipboard, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise, getProgressIcon } from "@raycast/utils";
import AddTaskCommand from "./add-task";
import { getSynologyAPI, handleAPIError } from "./lib/synology-api";
import { SynologyTask } from "./lib/types";
import type { TaskStatus } from "./lib/types";
import { TASK_STATUS_COLORS, TASK_TYPE_ICONS, FILTER_OPTIONS, REFRESH_INTERVAL } from "./lib/constants";
import {
  formatFileSize,
  formatSpeed,
  getTaskProgress,
  getTaskStatusText,
  isTaskActive,
  canPauseTask,
  canResumeTask,
  truncateTitle,
  getEstimatedTimeRemaining,
  isValidTimestamp,
  isValidString,
  isValidNumber,
} from "./lib/utils";

interface TaskFilterDropdownProps {
  onFilterChange: (filter: string) => void;
}

function TaskFilterDropdown({ onFilterChange }: TaskFilterDropdownProps) {
  return (
    <List.Dropdown tooltip="Filter Tasks by Status" storeValue={true} onChange={onFilterChange}>
      {FILTER_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
      ))}
    </List.Dropdown>
  );
}

export default function ListTasksCommand() {
  const [filter, setFilter] = useState<string>("all");
  const [showingDetail, setShowingDetail] = useState<boolean>(false);
  const synologyAPI = getSynologyAPI();

  const {
    data: tasks,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(
    async () => {
      try {
        const tasks = await synologyAPI.getTasks();
        return tasks;
      } catch (error) {
        await handleAPIError(error);
        return [];
      }
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

  // Auto-refresh for active downloads
  useEffect(() => {
    const hasActiveTasks = tasks?.some((task) => isTaskActive(task.status));
    if (hasActiveTasks) {
      const interval = setInterval(() => {
        revalidate();
      }, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [tasks, revalidate]);

  const filteredTasks =
    tasks?.filter((task) => {
      if (filter === "all") return true;
      return task.status === filter;
    }) || [];

  const handlePauseTask = async (task: SynologyTask) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Pausing Task",
        message: task.title,
      });

      await synologyAPI.pauseTask(task.id);
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Task Paused",
        message: task.title,
      });
    } catch (error) {
      await handleAPIError(error);
    }
  };

  const handleResumeTask = async (task: SynologyTask) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Resuming Task",
        message: task.title,
      });

      await synologyAPI.resumeTask(task.id);
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Task Resumed",
        message: task.title,
      });
    } catch (error) {
      await handleAPIError(error);
    }
  };

  const handleDeleteTask = async (task: SynologyTask) => {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Deleting Task",
        message: task.title,
      });

      await synologyAPI.deleteTask(task.id);
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Task Deleted",
        message: task.title,
      });
    } catch (error) {
      await handleAPIError(error);
    }
  };

  const handleCopyUrl = async (task: SynologyTask) => {
    const url = task.additional?.detail?.uri;
    if (isValidString(url)) {
      await Clipboard.copy(url!);
      await showToast({
        style: Toast.Style.Success,
        title: "URL Copied",
        message: "Download URL copied to clipboard",
      });
    }
  };

  function getTaskAccessories(task: SynologyTask) {
    const progress = getTaskProgress(task);
    const accessories: List.Item.Accessory[] = [];

    // Show progress for downloading tasks
    if (task.status === "downloading" && progress.totalSize > 0) {
      // Progress percentage with progress icon
      accessories.push({
        icon: getProgressIcon(progress.percentage / 100),
        text: `${progress.percentage}%`,
        tooltip: `${formatFileSize(progress.downloadedSize)} / ${formatFileSize(progress.totalSize)}`,
      });

      // Upload speed with arrow up icon
      if (isValidNumber(progress.uploadSpeed) && progress.uploadSpeed > 0) {
        accessories.push({
          icon: Icon.ArrowUpCircle,
          text: formatSpeed(progress.uploadSpeed),
          tooltip: "Upload speed",
        });
      }

      // Download speed with arrow down icon
      if (isValidNumber(progress.downloadSpeed) && progress.downloadSpeed > 0) {
        accessories.push({
          icon: Icon.ArrowDownCircle,
          text: formatSpeed(progress.downloadSpeed),
          tooltip: "Download speed",
        });

        // Estimated time remaining with clock icon
        const eta = getEstimatedTimeRemaining(progress.downloadedSize, progress.totalSize, progress.downloadSpeed);
        if (isValidString(eta) && eta !== "Unknown") {
          accessories.push({
            icon: Icon.Clock,
            text: eta,
            tooltip: "Estimated time remaining",
          });
        }
      }
    }

    return accessories;
  }

  // Group tasks by status for sections
  function getTasksByStatus() {
    const tasksByStatus: Record<string, SynologyTask[]> = {};

    filteredTasks.forEach((task) => {
      const status = task.status;
      if (!tasksByStatus[status]) {
        tasksByStatus[status] = [];
      }
      tasksByStatus[status].push(task);
    });

    return tasksByStatus;
  }

  function getTaskDetail(task: SynologyTask) {
    const progress = getTaskProgress(task);
    const detail = task.additional?.detail;
    const transfer = task.additional?.transfer;

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={task.title} />
            {isValidString(detail?.destination) && (
              <List.Item.Detail.Metadata.Label title="Destination" text={detail?.destination || "N/A"} />
            )}
            <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(task.size)} />

            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={getTaskStatusText(task.status)}
                color={TASK_STATUS_COLORS[task.status]}
              />
            </List.Item.Detail.Metadata.TagList>

            {/* Progress with icon */}
            {progress.totalSize > 0 && (
              <List.Item.Detail.Metadata.Label
                title="Progress"
                icon={getProgressIcon(progress.percentage / 100)}
                text={`${progress.percentage}% • ${formatFileSize(progress.downloadedSize)} of ${formatFileSize(progress.totalSize)}`}
              />
            )}

            {/* Speed information with icons */}
            <List.Item.Detail.Metadata.Label
              title="Download Speed"
              icon={Icon.ArrowDownCircle}
              text={formatSpeed(progress.downloadSpeed)}
            />
            <List.Item.Detail.Metadata.Label
              title="Upload Speed"
              icon={Icon.ArrowUpCircle}
              text={formatSpeed(progress.uploadSpeed)}
            />
            {task.status === "downloading" && progress.downloadSpeed > 0 && (
              <List.Item.Detail.Metadata.Label
                title="Time Remaining"
                icon={Icon.Clock}
                text={getEstimatedTimeRemaining(progress.downloadedSize, progress.totalSize, progress.downloadSpeed)}
              />
            )}

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.TagList title="Type">
              <List.Item.Detail.Metadata.TagList.Item
                text={task.type.toUpperCase()}
                icon={TASK_TYPE_ICONS[task.type] || Icon.Document}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Label title="User" text={task.username} />

            {isValidTimestamp(detail?.create_time) && (
              <List.Item.Detail.Metadata.Label
                title="Created Time"
                text={detail?.create_time ? new Date(detail.create_time * 1000).toLocaleString() : "N/A"}
              />
            )}

            {isValidTimestamp(detail?.started_time) && (
              <List.Item.Detail.Metadata.Label
                title="Started Time"
                text={detail?.started_time ? new Date(detail.started_time * 1000).toLocaleString() : "N/A"}
              />
            )}

            {isValidTimestamp(detail?.completed_time) && (
              <List.Item.Detail.Metadata.Label
                title="Completed Time"
                text={detail?.completed_time ? new Date(detail.completed_time * 1000).toLocaleString() : "N/A"}
              />
            )}

            {detail?.waiting_seconds !== undefined && detail.waiting_seconds > 0 && (
              <List.Item.Detail.Metadata.Label title="Waiting Time" text={`${detail?.waiting_seconds || 0} seconds`} />
            )}

            {/* URL Information */}
            {isValidString(detail?.uri) && (
              <List.Item.Detail.Metadata.Link
                title="Source URL"
                text={task.type === "bt" ? "Copy Magnet Link" : "Copy Download URL"}
                target="#"
              />
            )}

            {/* BitTorrent Specific Information */}
            {task.type === "bt" && (
              <>
                <List.Item.Detail.Metadata.Separator />

                {isValidNumber(detail?.total_pieces) && (
                  <List.Item.Detail.Metadata.Label
                    title="Total Pieces"
                    text={detail?.total_pieces?.toString() || "0"}
                  />
                )}

                {isValidNumber(transfer?.downloaded_pieces) && (
                  <List.Item.Detail.Metadata.Label
                    title="Downloaded Pieces"
                    text={transfer?.downloaded_pieces?.toString() || "0"}
                  />
                )}

                {isValidNumber(detail?.connected_peers) && (
                  <List.Item.Detail.Metadata.Label
                    title="Connected Peers"
                    text={detail?.connected_peers?.toString() || "0"}
                  />
                )}

                {isValidNumber(detail?.connected_seeders) && (
                  <List.Item.Detail.Metadata.Label
                    title="Connected Seeders"
                    text={detail?.connected_seeders?.toString() || "0"}
                  />
                )}

                {isValidNumber(detail?.connected_leechers) && (
                  <List.Item.Detail.Metadata.Label
                    title="Connected Leechers"
                    text={detail?.connected_leechers?.toString() || "0"}
                  />
                )}

                {isValidNumber(detail?.total_peers) && (
                  <List.Item.Detail.Metadata.Label title="Total Peers" text={detail?.total_peers?.toString() || "0"} />
                )}

                {detail?.seedelapsed !== undefined && detail.seedelapsed > 0 && (
                  <List.Item.Detail.Metadata.Label
                    title="Seed Elapsed"
                    text={
                      detail?.seedelapsed
                        ? `${Math.floor(detail.seedelapsed / 3600)}h ${Math.floor((detail.seedelapsed % 3600) / 60)}m`
                        : "0h 0m"
                    }
                  />
                )}
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function getTaskActions(task: SynologyTask) {
    return (
      <ActionPanel>
        <ActionPanel.Section title="View">
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeSlash : Icon.Eye}
            onAction={() => setShowingDetail(!showingDetail)}
          />
        </ActionPanel.Section>

        <ActionPanel.Section title="Task Actions">
          {canPauseTask(task.status) && (
            <Action
              title="Pause Task"
              icon={Icon.Pause}
              onAction={() => handlePauseTask(task)}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
            />
          )}
          {canResumeTask(task.status) && (
            <Action
              title="Resume Task"
              icon={Icon.Play}
              onAction={() => handleResumeTask(task)}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
            />
          )}
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => handleDeleteTask(task)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section title="Copy">
          <Action
            title="Copy Task Title"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(task.title)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {isValidString(task.additional?.detail?.uri) && (
            <Action
              title="Copy Download URL"
              icon={Icon.Link}
              onAction={() => handleCopyUrl(task)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel.Section>

        <ActionPanel.Section title="Other">
          <Action.Push
            title="Add New Task"
            icon={Icon.Plus}
            target={<AddTaskCommand />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Refresh Tasks"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const tasksByStatus = getTasksByStatus();
  const shouldShowSections = filter === "all" && filteredTasks.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search download tasks..."
      searchBarAccessory={<TaskFilterDropdown onFilterChange={setFilter} />}
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Download}
          title={filter === "all" ? "No Download Tasks" : `No ${filter} Tasks`}
          description={
            filter === "all"
              ? "Create your first download task using the 'Add New Task' command"
              : `No tasks with status "${filter}" found`
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Task"
                icon={Icon.Plus}
                target={<AddTaskCommand />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action title="Refresh Tasks" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : shouldShowSections ? (
        // Render tasks grouped by status when showing all tasks
        Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <List.Section
            key={status}
            title={getTaskStatusText(status as TaskStatus)}
            subtitle={`${statusTasks.length} ${statusTasks.length === 1 ? "task" : "tasks"}`}
          >
            {statusTasks.map((task) => (
              <List.Item
                key={task.id}
                icon={{
                  source: TASK_TYPE_ICONS[task.type] || Icon.Document,
                  tintColor: TASK_STATUS_COLORS[task.status],
                }}
                title={showingDetail ? task.title : truncateTitle(task.title)}
                subtitle={showingDetail ? undefined : formatFileSize(task.size)}
                accessories={showingDetail ? undefined : getTaskAccessories(task)}
                actions={getTaskActions(task)}
                detail={showingDetail ? getTaskDetail(task) : undefined}
              />
            ))}
          </List.Section>
        ))
      ) : (
        // Render tasks without sections when filtering by specific status
        filteredTasks.map((task) => (
          <List.Item
            key={task.id}
            icon={{
              source: TASK_TYPE_ICONS[task.type] || Icon.Document,
              tintColor: TASK_STATUS_COLORS[task.status],
            }}
            title={showingDetail ? task.title : truncateTitle(task.title)}
            subtitle={showingDetail ? undefined : formatFileSize(task.size)}
            accessories={showingDetail ? undefined : getTaskAccessories(task)}
            actions={getTaskActions(task)}
            detail={showingDetail ? getTaskDetail(task) : undefined}
          />
        ))
      )}
    </List>
  );
}
