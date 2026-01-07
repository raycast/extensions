import { Form, ActionPanel, Action, showToast, Toast, popToRoot, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, CreateTaskPayload, ApiError } from "./api";
import {
  useCurrentUser,
  useAccountsWithRecents,
  useUsers,
  useProjects,
  useMilestones,
  useFormDefaults,
  useAuthErrorHandler,
} from "./hooks";
import { addRecentAccount, setLastUsed, toRFC3339, getTaskUrl } from "./utils";

interface FormValues {
  title: string;
  accountId: string;
  body: string;
  assigneeId: string;
  projectId: string;
  milestoneId: string;
  dueDate: Date | null;
  customerPortalVisible: boolean;
}

export default function CreateTaskCommand() {
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUser();
  const { data: accounts, recentIds, isLoading: isLoadingAccounts } = useAccountsWithRecents();
  const { data: users, isLoading: isLoadingUsers } = useUsers();

  // Load form defaults from preferences and storage
  const formDefaults = useFormDefaults(currentUser?.id);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle auth errors
  useAuthErrorHandler(userError);

  // Apply defaults when they're loaded
  useEffect(() => {
    if (formDefaults.isLoaded) {
      if (!selectedAccountId && formDefaults.accountId) {
        setSelectedAccountId(formDefaults.accountId);
      }
      if (!selectedProjectId && formDefaults.projectId) {
        setSelectedProjectId(formDefaults.projectId);
      }
    }
  }, [formDefaults.isLoaded, formDefaults.accountId, formDefaults.projectId, selectedAccountId, selectedProjectId]);

  const { data: projects, isLoading: isLoadingProjects } = useProjects(selectedAccountId);
  const { data: milestones, isLoading: isLoadingMilestones } = useMilestones(selectedProjectId);

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    if (!values.accountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Account is required",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTaskPayload = {
        title: values.title.trim(),
        account_id: values.accountId,
        status: "not_started",
        customer_portal_visible: values.customerPortalVisible,
      };

      if (values.assigneeId) {
        payload.assignee_id = values.assigneeId;
      }

      if (values.body.trim()) {
        payload.body_html = values.body.trim();
      }

      if (values.projectId) {
        payload.project_id = values.projectId;
      }

      if (values.milestoneId) {
        payload.milestone_id = values.milestoneId;
      }

      if (values.dueDate) {
        payload.due_date = toRFC3339(values.dueDate);
      }

      const task = await createTask(payload);

      // Save to recent accounts and last used
      await addRecentAccount(values.accountId);
      await setLastUsed({
        accountId: values.accountId,
        projectId: values.projectId || undefined,
        assigneeId: values.assigneeId || undefined,
      });

      const taskUrl = getTaskUrl(task.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Pylon",
          onAction: () => open(taskUrl),
        },
      });

      await popToRoot();
    } catch (error) {
      console.error("Failed to create task:", error);

      if (error instanceof ApiError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: error.message,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isLoadingUser || isLoadingAccounts || isLoadingUsers || !formDefaults.isLoaded;

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter task title" autoFocus />

      <Form.Dropdown
        id="accountId"
        title="Account"
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        isLoading={isLoadingAccounts}
      >
        <Form.Dropdown.Item value="" title="Select an account..." />
        {recentIds.length > 0 && (
          <Form.Dropdown.Section title="Recent">
            {accounts
              .filter((a) => recentIds.includes(a.id))
              .map((account) => (
                <Form.Dropdown.Item
                  key={account.id}
                  value={account.id}
                  title={account.name}
                  icon={account.logo_url || "🏢"}
                />
              ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section title="All Accounts">
          {accounts
            .filter((a) => !recentIds.includes(a.id))
            .map((account) => (
              <Form.Dropdown.Item
                key={account.id}
                value={account.id}
                title={account.name}
                icon={account.logo_url || "🏢"}
              />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextArea id="body" title="Description" placeholder="Enter task description (optional)" />

      <Form.Dropdown id="assigneeId" title="Assignee" defaultValue={formDefaults.assigneeId} isLoading={isLoadingUsers}>
        <Form.Dropdown.Item value="" title="Unassigned" />
        {currentUser && (
          <Form.Dropdown.Item
            value={currentUser.id}
            title={`${currentUser.name} (me)`}
            icon={currentUser.avatar_url || "👤"}
          />
        )}
        {users
          ?.filter((u) => u.id !== currentUser?.id)
          .map((user) => (
            <Form.Dropdown.Item key={user.id} value={user.id} title={user.name} icon={user.avatar_url || "👤"} />
          ))}
      </Form.Dropdown>

      {selectedAccountId && (
        <Form.Dropdown
          id="projectId"
          title="Project"
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          isLoading={isLoadingProjects}
        >
          <Form.Dropdown.Item value="" title="No project" />
          {projects?.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
          ))}
        </Form.Dropdown>
      )}

      {selectedProjectId && (
        <Form.Dropdown id="milestoneId" title="Milestone" isLoading={isLoadingMilestones}>
          <Form.Dropdown.Item value="" title="No milestone" />
          {milestones?.map((milestone) => (
            <Form.Dropdown.Item key={milestone.id} value={milestone.id} title={milestone.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.DatePicker id="dueDate" title="Due Date" />

      <Form.Checkbox
        id="customerPortalVisible"
        title="Visibility"
        label="Visible in Customer Portal"
        defaultValue={false}
      />
    </Form>
  );
}
