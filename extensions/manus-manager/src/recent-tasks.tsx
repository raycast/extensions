import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

type TaskStatus = "pending" | "running" | "completed" | "failed";

type Task = {
  id: string;
  created_at: number;
  updated_at: number;
  status: TaskStatus;
  output?: unknown;
  error?: string;
  model: string;
  credit_usage: number;
  metadata: {
    task_title: string;
  };
};

type TasksResponse = {
  data: Task[];
  has_more: boolean;
  last_id?: string;
};

const API_BASE_URL = "https://api.manus.ai/v1/tasks";
const TASK_URL_BASE = "https://manus.im/app";

const STATUS_ICONS: Record<TaskStatus, { source: Icon; tintColor: Color }> = {
  pending: { source: Icon.Clock, tintColor: Color.Yellow },
  running: { source: Icon.Play, tintColor: Color.Blue },
  completed: { source: Icon.CheckCircle, tintColor: Color.Green },
  failed: { source: Icon.XmarkCircle, tintColor: Color.Red },
};

function buildTaskTitle(task: Task) {
  return task.metadata.task_title;
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  useEffect(() => {
    const handle = setTimeout(() => setQuery(searchText.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchText]);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      order: "desc",
      orderBy: "updated_at",
      limit: "20",
    });
    if (query) {
      params.set("query", query);
    }
    if (statusFilter !== "all") {
      params.append("status", statusFilter);
    }
    return `${API_BASE_URL}?${params.toString()}`;
  }, [query, statusFilter]);

  const { data, isLoading, error, revalidate } = useFetch<TasksResponse>(url, {
    headers: {
      API_KEY: apiKey,
    },
    execute: Boolean(apiKey),
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  const tasks = data?.data ?? [];

  const handleDelete = async (taskId: string) => {
    const confirmed = await confirmAlert({
      title: "Delete task?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting task",
    });
    try {
      const response = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: "DELETE",
        headers: {
          API_KEY: apiKey,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed (${response.status})`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Task deleted";
      await revalidate();
    } catch (deleteError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete task";
      toast.message =
        deleteError instanceof Error ? deleteError.message : "Unknown error";
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by task content"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as "all" | TaskStatus)}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.Filter} />
          {Object.entries(STATUS_ICONS).map(([status, icon]) => (
            <List.Dropdown.Item
              key={status}
              title={status.charAt(0).toUpperCase() + status.slice(1)}
              value={status}
              icon={{ source: icon.source, tintColor: icon.tintColor }}
            />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      <List.EmptyView
        title={apiKey ? "No recent tasks found" : "Missing API Key"}
        description={
          apiKey
            ? query
              ? "Try a different search term."
              : "Try creating tasks in Manus first."
            : "Set your Manus API key in preferences."
        }
      />
      {tasks.map((task) => {
        const statusIcon = STATUS_ICONS[task.status];
        const accessories: List.Item.Accessory[] = [];
        if (typeof task.credit_usage === "number") {
          accessories.push({ text: `${task.credit_usage} credits` });
        }
        accessories.push({ date: new Date(task.updated_at * 1000) });
        return (
          <List.Item
            key={task.id}
            icon={statusIcon}
            title={buildTaskTitle(task)}
            subtitle={
              task.status === "failed" ? (task.error ?? "Failed") : undefined
            }
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${TASK_URL_BASE}/${task.id}`} />
                <Action.CopyToClipboard
                  title="Copy Task URL"
                  content={`${TASK_URL_BASE}/${task.id}`}
                />
                <Action
                  title="Delete Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(task.id)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
