import {
  Action,
  ActionPanel,
  Form,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showToast,
} from "@raycast/api";

type Preferences = {
  workosUrl: string;
  apiToken: string;
  email: string;
  workspaceId?: string;
};

type FormValues = {
  title: string;
  priority: "low" | "medium" | "high";
  scheduledFor?: Date;
  project?: string;
};

function toDateKey(date?: Date) {
  if (!date) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Command() {
  async function submit(values: FormValues) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Give the task a name",
      });
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    const workosUrl = preferences.workosUrl.replace(/\/$/, "");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Capturing task...",
    });

    try {
      const response = await fetch(`${workosUrl}/api/raycast/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: preferences.email,
          workspaceId: preferences.workspaceId || undefined,
          title,
          priority: values.priority,
          scheduledFor: toDateKey(values.scheduledFor),
          project: values.project?.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "WorkOS rejected the capture");
      }

      toast.style = Toast.Style.Success;
      toast.title = "Captured in WorkOS";
      toast.message = payload.message;
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not capture task";
      toast.message = error instanceof Error ? error.message : "Try again";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task"
        placeholder="Get it out of your head..."
        autoFocus
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="medium">
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.DatePicker id="scheduledFor" title="Date" />
      <Form.TextField
        id="project"
        title="Project"
        placeholder="Optional exact project name"
      />
    </Form>
  );
}
