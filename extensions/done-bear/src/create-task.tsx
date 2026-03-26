import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
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
  workspaceId: string;
}

async function submitChecklistItems(workspaceId: string, taskId: string, raw: string | undefined) {
  const lines = (raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    await createChecklistItem(workspaceId, taskId, lines[i], i);
  }
}

function CreateTask() {
  const { workspaces, workspaceId: selectedWorkspaceId, isLoading: isLoadingWorkspace } = useWorkspaces();
  const isAll = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: {
      title: "",
      description: "",
      when: "today",
      startDate: null,
      deadline: null,
      projectId: "",
      teamId: "",
      checklistItems: "",
      workspaceId: "",
    },
    validation: {
      title: (value) => (!value?.trim() ? "Title is required" : undefined),
      workspaceId: (value) => {
        if (isAll && workspaces.length > 1 && !value?.trim()) {
          return "Workspace is required";
        }
        return undefined;
      },
    },
    async onSubmit(values) {
      const targetWorkspaceId = isAll ? values.workspaceId || workspaces[0]?.id : selectedWorkspaceId;

      if (!targetWorkspaceId) {
        await showToast({ style: Toast.Style.Failure, title: "No workspace selected" });
        return;
      }

      setIsSubmitting(true);
      try {
        const taskId = await createTask(targetWorkspaceId, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          view: (values.when as TaskView) || "today",
          startDate: values.startDate ? dateOnlyEpochFromLocalDate(values.startDate) : undefined,
          deadlineAt: values.deadline ? dateOnlyEpochFromLocalDate(values.deadline) : undefined,
          projectId: values.projectId || undefined,
          teamId: values.teamId || undefined,
        });

        await submitChecklistItems(targetWorkspaceId, taskId, values.checklistItems);

        await showToast({ style: Toast.Style.Success, title: "Task created" });
        await popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (!isAll || !workspaces[0]?.id) {
      return;
    }
    setValue("workspaceId", (current) => current || workspaces[0]!.id);
  }, [isAll, workspaces, setValue]);

  const effectiveWorkspaceId = isAll ? values.workspaceId || workspaces[0]?.id || null : selectedWorkspaceId;
  const { projects, isLoading: isLoadingProjects } = useProjects(effectiveWorkspaceId);
  const { teams, isLoading: isLoadingTeams } = useTeams(effectiveWorkspaceId);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Task" />
        </ActionPanel>
      }
      isLoading={isLoadingWorkspace || isLoadingProjects || isLoadingTeams || isSubmitting}
    >
      <Form.TextField autoFocus placeholder="Task title..." title="Title" {...itemProps.title} />
      <Form.TextArea placeholder="Task description..." title="Description" {...itemProps.description} />
      <Form.Separator />
      {isAll && workspaces.length > 1 && (
        <Form.Dropdown title="Workspace" {...itemProps.workspaceId}>
          {workspaces.map((w) => (
            <Form.Dropdown.Item key={w.id} title={w.name} value={w.id} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="When" {...itemProps.when}>
        <Form.Dropdown.Item title="Inbox" value="inbox" />
        <Form.Dropdown.Item title="Today" value="today" />
        <Form.Dropdown.Item title="Anytime" value="anytime" />
        <Form.Dropdown.Item title="Upcoming" value="upcoming" />
        <Form.Dropdown.Item title="Someday" value="someday" />
      </Form.Dropdown>
      {values.when === "upcoming" && <Form.DatePicker title="Start Date" {...itemProps.startDate} />}
      <Form.DatePicker title="Deadline" {...itemProps.deadline} />
      <Form.Dropdown title="Project" {...itemProps.projectId}>
        <Form.Dropdown.Item title="No Project" value="" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} title={p.name} value={p.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Team" {...itemProps.teamId}>
        <Form.Dropdown.Item title="No Team" value="" />
        {teams.map((t) => (
          <Form.Dropdown.Item key={t.id} title={t.name} value={t.id} />
        ))}
      </Form.Dropdown>
      <Form.TextArea placeholder="One item per line..." title="Checklist Items" {...itemProps.checklistItems} />
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateTask);
