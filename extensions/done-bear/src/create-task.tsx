import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCallback, useState } from "react";

import { createChecklistItem, createTask } from "./api/mutations";
import type { TaskView } from "./api/types";
import { dateOnlyEpochFromLocalDate } from "./helpers/date-codecs";
import { useProjects } from "./hooks/use-projects";
import { useTeams } from "./hooks/use-teams";
import { ALL_WORKSPACES_ID, useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

interface FormValues {
  title: string;
  description: string;
  when: string;
  startDate: Date | null;
  deadline: Date | null;
  projectId: string;
  teamId: string;
  checklistItems: string;
  workspaceId?: string;
}

const validateFormValues = (values: FormValues, targetWorkspaceId: string | null | undefined): string | null => {
  if (!values.title.trim()) {
    return "Title is required";
  }
  if (!targetWorkspaceId) {
    return "No workspace selected";
  }
  return null;
};

const submitChecklistItems = async (workspaceId: string, taskId: string, raw: string | undefined) => {
  const lines = (raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i += 1) {
    await createChecklistItem(workspaceId, taskId, lines[i], i);
  }
};

const CreateTask = () => {
  const { workspaces, workspaceId: selectedWorkspaceId, isLoading: isLoadingWorkspace } = useWorkspaces();
  const isAll = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const [formWorkspaceId, setFormWorkspaceId] = useState<string>("");
  const effectiveWorkspaceId = isAll ? formWorkspaceId || workspaces[0]?.id || null : selectedWorkspaceId;
  const { projects, isLoading: isLoadingProjects } = useProjects(effectiveWorkspaceId);
  const { teams, isLoading: isLoadingTeams } = useTeams(effectiveWorkspaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whenValue, setWhenValue] = useState("today");

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const targetWorkspaceId = isAll ? values.workspaceId || workspaces[0]?.id : selectedWorkspaceId;

      const validationError = validateFormValues(values, targetWorkspaceId);
      if (validationError) {
        await showToast({ style: Toast.Style.Failure, title: validationError });
        return;
      }

      setIsSubmitting(true);
      try {
        const taskId = await createTask(targetWorkspaceId as string, {
          deadlineAt: values.deadline ? dateOnlyEpochFromLocalDate(values.deadline) : undefined,
          description: values.description?.trim() || undefined,
          projectId: values.projectId || undefined,
          startDate: values.startDate ? dateOnlyEpochFromLocalDate(values.startDate) : undefined,
          teamId: values.teamId || undefined,
          title: values.title.trim(),
          view: (values.when as TaskView) || "today",
        });

        await submitChecklistItems(targetWorkspaceId as string, taskId, values.checklistItems);

        await showToast({ style: Toast.Style.Success, title: "Task created" });
        await popToRoot();
      } catch (error) {
        await showToast({
          message: error instanceof Error ? error.message : "Unknown error",
          style: Toast.Style.Failure,
          title: "Failed to create task",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isAll, workspaces, selectedWorkspaceId],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Task" />
        </ActionPanel>
      }
      isLoading={isLoadingWorkspace || isLoadingProjects || isLoadingTeams || isSubmitting}
    >
      <Form.TextField autoFocus id="title" placeholder="Task title..." title="Title" />
      <Form.TextArea id="description" placeholder="Task description..." title="Description" />
      <Form.Separator />
      {isAll && workspaces.length > 1 && (
        <Form.Dropdown
          defaultValue={workspaces[0]?.id}
          id="workspaceId"
          onChange={setFormWorkspaceId}
          title="Workspace"
        >
          {workspaces.map((w) => (
            <Form.Dropdown.Item key={w.id} title={w.name} value={w.id} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown defaultValue="today" id="when" onChange={setWhenValue} title="When">
        <Form.Dropdown.Item title="Inbox" value="inbox" />
        <Form.Dropdown.Item title="Today" value="today" />
        <Form.Dropdown.Item title="Anytime" value="anytime" />
        <Form.Dropdown.Item title="Upcoming" value="upcoming" />
        <Form.Dropdown.Item title="Someday" value="someday" />
      </Form.Dropdown>
      {whenValue === "upcoming" && <Form.DatePicker id="startDate" title="Start Date" />}
      <Form.DatePicker id="deadline" title="Deadline" />
      <Form.Dropdown defaultValue="" id="projectId" title="Project">
        <Form.Dropdown.Item title="No Project" value="" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} title={p.name} value={p.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown defaultValue="" id="teamId" title="Team">
        <Form.Dropdown.Item title="No Team" value="" />
        {teams.map((t) => (
          <Form.Dropdown.Item key={t.id} title={t.name} value={t.id} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="checklistItems" placeholder="One item per line..." title="Checklist Items" />
    </Form>
  );
};

export default withAccessToken(oauthService)(CreateTask);
