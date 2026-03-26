import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  open,
  getPreferenceValues,
  LaunchType,
  launchCommand,
  getSelectedText,
  LaunchProps,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getProjects,
  getLabels,
  createTask,
  addLabelsToTask,
  Project,
  Label,
} from "./api";
import { PRIORITY_MAP } from "./helpers/priorities";

export default function CreateTask(
  props: LaunchProps<{ arguments: Arguments.CreateTask }>,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const argTitle = props.arguments.title?.trim() ?? "";
  const [prefillTitle, setPrefillTitle] = useState(argTitle);
  const [prefillReady, setPrefillReady] = useState(!!argTitle);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, l] = await Promise.all([getProjects(), getLabels()]);
        setProjects(p);
        setLabels(l);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    if (!argTitle) {
      getSelectedText()
        .then((text) => {
          // Only prefill if there's actual selected text (non-empty, reasonable length)
          const trimmed = text?.trim();
          if (trimmed && trimmed.length > 0 && trimmed.length < 500) {
            setPrefillTitle(trimmed);
          }
        })
        .catch(() => {
          // No selected text available — leave title empty
        })
        .finally(() => setPrefillReady(true));
    }
  }, []);

  async function handleSubmit(values: {
    title: string;
    description: string;
    projectId: string;
    dueDate: Date | null;
    priority: string;
    labelIds: string[];
    isFavorite: boolean;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const projectId = parseInt(values.projectId);
    if (isNaN(projectId)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a project",
      });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task..." });

      const task = await createTask(projectId, {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        priority: parseInt(values.priority) || 0,
        is_favorite: values.isFavorite,
      });

      if (values.labelIds?.length > 0) {
        const numericLabelIds = values.labelIds.map((id) => parseInt(id));
        await addLabelsToTask(task.id, numericLabelIds);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Vikunja",
          onAction: () => {
            const { apiUrl } = getPreferenceValues<Preferences>();
            open(`${apiUrl.replace(/\/+$/, "")}/projects/${projectId}`);
          },
        },
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading || !prefillReady}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="List Tasks"
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "list-tasks",
                    type: LaunchType.UserInitiated,
                  });
                } catch {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to launch List Tasks",
                  });
                }
              }}
            />
            <Action.OpenInBrowser
              title="Open Vikunja"
              url={getPreferenceValues<Preferences>().apiUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {prefillReady && (
        <>
          <Form.TextField
            id="title"
            title="Title"
            placeholder="Task title"
            defaultValue={prefillTitle}
            autoFocus
          />
          <Form.TextArea
            id="description"
            title="Description"
            placeholder="Optional description"
          />
          <Form.Dropdown id="projectId" title="Project">
            {projects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={String(project.id)}
                title={project.title}
              />
            ))}
          </Form.Dropdown>
          <Form.DatePicker
            id="dueDate"
            title="Due Date"
            type={Form.DatePicker.Type.Date}
          />
          <Form.Dropdown id="priority" title="Priority" defaultValue="0">
            {Object.entries(PRIORITY_MAP).map(([value, label]) => (
              <Form.Dropdown.Item key={value} value={value} title={label} />
            ))}
          </Form.Dropdown>
          <Form.TagPicker id="labelIds" title="Labels">
            {labels.map((label) => (
              <Form.TagPicker.Item
                key={label.id}
                value={String(label.id)}
                title={label.title}
              />
            ))}
          </Form.TagPicker>
          <Form.Checkbox
            id="isFavorite"
            title="Favorite"
            label="Mark as favorite"
            defaultValue={false}
          />
        </>
      )}
    </Form>
  );
}
