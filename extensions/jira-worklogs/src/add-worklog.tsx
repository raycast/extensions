import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import { differenceInSeconds } from "date-fns";

import { JiraIssue, Worklog } from "@/types";
import { getErrorMessage } from "@/utils/format";
import { useDebounce } from "@/utils/hooks";
import { jiraClient } from "@/utils/jira";
import { getWorklogs, saveWorklog } from "@/utils/storage";

interface FormValues {
  taskId: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  destination: "local" | "jira";
}

interface Props {
  worklog?: Worklog;
  onSave?: () => void;
}

export default function Command({ worklog, onSave }: Props) {
  const [taskId, setTaskId] = useState<string>(worklog?.taskId || "");
  const [description, setDescription] = useState<string>(worklog?.description || "");
  const [isInProgress, setIsInProgress] = useState<boolean>(!!(worklog && !worklog.endTime));
  const [startTime, setStartTime] = useState<Date | null>(worklog ? new Date(worklog.startTime) : null);
  const [endTime, setEndTime] = useState<Date | null>(worklog?.endTime ? new Date(worklog.endTime) : null);
  const [destination, setDestination] = useState<string>("local");

  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [existingInProgress, setExistingInProgress] = useState<Worklog | null>(null);

  const debouncedSearchText = useDebounce(searchText, 500);

  const navigation = useNavigation();

  function resetForm() {
    setTaskId("");
    setDescription("");
    setStartTime(null);
    setEndTime(null);
    setIsInProgress(false);
    // Keep destination preference
  }

  useEffect(() => {
    async function fetchIssues() {
      setIsLoading(true);
      try {
        if (!debouncedSearchText) {
          setIsSearching(false);
          const fetched = await jiraClient.getAssignedIssues();
          setIssues(fetched);
        } else {
          setIsSearching(true);
          const results = await jiraClient.searchIssues(debouncedSearchText);
          setIssues(results);
        }
      } catch (error) {
        console.error("Failed to fetch/search issues", error);

        // Only show detailed error toast for initial load (empty search)
        // or let the user know search failed.
        if (!debouncedSearchText) {
          let message = getErrorMessage(error);

          try {
            await jiraClient.validateCredentials();
            message = `Search failed: ${message}`;
          } catch (authError) {
            message = `Connection failed: ${getErrorMessage(authError)}`;
          }

          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load assigned tasks",
            message: message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchIssues();
  }, [debouncedSearchText]);

  useEffect(() => {
    async function checkInProgress() {
      try {
        const logs = await getWorklogs();
        const found = logs.find((w) => !w.endTime && w.id !== worklog?.id);
        setExistingInProgress(found || null);
      } catch (error) {
        console.error("Failed to check for in-progress worklogs", error);
      }
    }
    checkInProgress();
  }, [worklog]);

  async function handleSubmit(values: FormValues, addAnother = false) {
    if (!values.taskId) {
      await showToast({ style: Toast.Style.Failure, title: "Task ID is required" });
      return;
    }
    if (!values.startTime) {
      await showToast({ style: Toast.Style.Failure, title: "Start time is required" });
      return;
    }
    const startTime = values.startTime;

    if (isInProgress && startTime > new Date()) {
      await showToast({ style: Toast.Style.Failure, title: "In-progress worklogs cannot start in the future" });
      return;
    }

    if (isInProgress && existingInProgress) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Another worklog is already in progress",
        message: `Task: ${existingInProgress.taskId}`,
      });
      return;
    }

    if (!isInProgress && !values.endTime) {
      await showToast({ style: Toast.Style.Failure, title: "End time is required" });
      return;
    }

    let durationSeconds: number | undefined;
    if (!isInProgress && values.endTime) {
      // Normalize dates to remove milliseconds for accurate duration calculation
      // This prevents off-by-one errors when milliseconds are present
      const normalizedStartTime = new Date(Math.floor(startTime.getTime() / 1000) * 1000);
      const normalizedEndTime = new Date(Math.floor(values.endTime.getTime() / 1000) * 1000);
      durationSeconds = differenceInSeconds(normalizedEndTime, normalizedStartTime);
      if (durationSeconds <= 0) {
        await showToast({ style: Toast.Style.Failure, title: "Duration must be positive" });
        return;
      }
    }

    const selectedIssue = issues.find((i) => i.key === values.taskId);

    const newWorklog: Worklog = {
      id: worklog?.id || randomUUID(),
      taskId: values.taskId,
      taskSummary: selectedIssue?.summary || worklog?.taskSummary,
      description: values.description,
      startTime: startTime.toISOString(),
      endTime: isInProgress || !values.endTime ? undefined : values.endTime.toISOString(),
      durationSeconds: durationSeconds,
    };

    if (values.destination === "jira") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading to Jira..." });
      try {
        await jiraClient.submitWorklog(newWorklog);
        toast.style = Toast.Style.Success;
        toast.title = "Uploaded to Jira";
        if (addAnother) {
          resetForm();
        } else if (onSave) {
          onSave();
          navigation.pop();
        } else {
          popToRoot();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to upload";
        toast.message = getErrorMessage(error);
      }
    } else {
      try {
        await saveWorklog(newWorklog);
        await showToast({ style: Toast.Style.Success, title: worklog ? "Worklog Updated" : "Worklog Saved Locally" });
        if (addAnother) {
          resetForm();
        } else if (onSave) {
          onSave();
          navigation.pop();
        } else {
          popToRoot();
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save worklog",
          message: getErrorMessage(error),
        });
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Worklog"
            icon={Icon.Checkmark}
            onSubmit={(values: FormValues) => handleSubmit(values, false)}
          />
          {!worklog && (
            <Action.SubmitForm
              title="Submit and Add Another"
              icon={Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onSubmit={(values: FormValues) => handleSubmit(values, true)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="taskId" title="Task" value={taskId} onChange={setTaskId} onSearchTextChange={setSearchText}>
        {issues.map((issue) => (
          <Form.Dropdown.Item key={issue.key} value={issue.key} title={`${issue.key}: ${issue.summary}`} />
        ))}
        {/* Only show current taskId as fallback when not searching and it's not in the list */}
        {!isSearching && taskId && !issues.some((i) => i.key === taskId) && (
          <Form.Dropdown.Item key={taskId} value={taskId} title={taskId} />
        )}
      </Form.Dropdown>

      <Form.Checkbox
        id="isInProgress"
        title="In Progress"
        label={existingInProgress ? `Already in progress: ${existingInProgress.taskId}` : ""}
        value={isInProgress}
        onChange={setIsInProgress}
      />

      <Form.DatePicker id="startTime" title="Start Time" value={startTime} onChange={setStartTime} />
      {!isInProgress && <Form.DatePicker id="endTime" title="End Time" value={endTime} onChange={setEndTime} />}
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What did you work on?"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      {!isInProgress && (
        <Form.Dropdown id="destination" title="Destination" value={destination} onChange={setDestination}>
          <Form.Dropdown.Item value="local" title="Save Locally" icon={Icon.HardDrive} />
          <Form.Dropdown.Item value="jira" title="Upload to Jira" icon={Icon.Cloud} />
        </Form.Dropdown>
      )}
    </Form>
  );
}
