import { Action, ActionPanel, Form, Icon, Toast, open, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { CreateTaskBody, Task, UpdateTaskBody, createTask, getSections, getTaskUrl, updateTask } from "../api";
import { colorHex } from "../helpers/colors";
import { toIsoDate } from "../helpers/dates";
import { priorities } from "../helpers/priorities";
import { refreshMenuBar, useLabels, useProjects } from "../hooks/useData";

type TaskFormValues = {
  content: string;
  description: string;
  due: string;
  deadline: Date | null;
  priority: string;
  project: string;
  section: string;
  labels: string[];
};

type TaskFormProps = {
  task?: Task;
  initialProjectId?: string;
  mutate?: () => Promise<unknown>;
};

function initialDueText(task?: Task): string {
  if (!task?.due) return "";
  if (task.due.is_recurring) return task.due.string;
  return task.due.time ? `${task.due.date} ${task.due.time}` : task.due.date;
}

export default function TaskForm({ task, initialProjectId, mutate }: TaskFormProps) {
  const { pop } = useNavigation();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: labels, isLoading: isLoadingLabels } = useLabels();

  const initialDue = initialDueText(task);
  const initialDeadline = task?.deadline_date ? new Date(`${task.deadline_date}T00:00:00`) : null;

  const { handleSubmit, itemProps, values, setValue, focus, reset } = useForm<TaskFormValues>({
    initialValues: {
      content: task?.content ?? "",
      description: task?.description ?? "",
      due: initialDue,
      deadline: initialDeadline,
      priority: String(task?.priority ?? 4),
      project: task?.project_id ?? initialProjectId ?? "",
      section: task?.section_id ?? "",
      labels: task?.labels ?? [],
    },
    validation: {
      content: FormValidation.Required,
    },
    async onSubmit(formValues) {
      if (task) {
        await editTask(formValues);
      } else {
        await addTask(formValues);
      }
    },
  });

  const { data: sections } = useCachedPromise(getSections, [values.project], {
    execute: values.project.length > 0,
    keepPreviousData: false,
  });

  async function addTask(formValues: TaskFormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Creating task" });
    try {
      const body: CreateTaskBody = {
        content: formValues.content.trim(),
        description: formValues.description,
        priority: Number(formValues.priority) as 1 | 2 | 3 | 4,
        labels: formValues.labels,
      };
      if (formValues.due.trim()) body.due = { string: formValues.due.trim() };
      if (formValues.deadline) body.deadline_date = toIsoDate(formValues.deadline);
      if (formValues.project) body.project_id = formValues.project;
      if (formValues.section) body.section_id = formValues.section;

      const created = await createTask(body);
      await mutate?.();
      await refreshMenuBar();

      const toast = await showToast({
        style: Toast.Style.Success,
        title: "Created task",
        message: created.content,
      });
      toast.primaryAction = {
        title: "Open in OpenTask",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => open(getTaskUrl(created.id)),
      };

      reset({ content: "", description: "", due: "", deadline: null, labels: [] });
      focus("content");
    } catch (error) {
      await showFailureToast(error, { title: "Unable to create task" });
    }
  }

  async function editTask(formValues: TaskFormValues) {
    if (!task) return;
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });
    try {
      const patch: UpdateTaskBody = {
        content: formValues.content.trim(),
        description: formValues.description,
        priority: Number(formValues.priority) as 1 | 2 | 3 | 4,
        labels: formValues.labels,
      };
      // Only send `due` when the text changed, so untouched natural-language
      // dates (e.g. "every friday") aren't re-anchored to today.
      if (formValues.due !== initialDue) {
        patch.due = formValues.due.trim() ? { string: formValues.due.trim() } : null;
      }
      const newDeadline = formValues.deadline ? toIsoDate(formValues.deadline) : null;
      if (newDeadline !== (task.deadline_date ?? null)) {
        patch.deadline_date = newDeadline;
      }
      if (formValues.project && formValues.project !== task.project_id) {
        patch.project_id = formValues.project;
        patch.section_id = formValues.section || null;
      } else if ((formValues.section || null) !== task.section_id) {
        patch.section_id = formValues.section || null;
      }

      await updateTask(task.id, patch);
      await mutate?.();
      await refreshMenuBar();
      await showToast({ style: Toast.Style.Success, title: "Updated task" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update task" });
    }
  }

  return (
    <Form
      navigationTitle={task ? "Edit Task" : "Create Task"}
      isLoading={isLoadingProjects || isLoadingLabels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={task ? "Save Changes" : "Create Task"}
            icon={task ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.content} title="Task" placeholder="Prepare the launch checklist" />
      <Form.TextField
        {...itemProps.due}
        title="Due"
        placeholder="tomorrow 5pm, every friday, aug 12…"
        info="Natural language, parsed by your OpenTask server's smart input."
      />
      <Form.Dropdown {...itemProps.priority} title="Priority">
        {priorities.map((priority) => (
          <Form.Dropdown.Item
            key={priority.value}
            value={String(priority.value)}
            title={priority.name}
            icon={{ source: Icon.CircleFilled, tintColor: priority.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        {...itemProps.project}
        title="Project"
        onChange={(newValue) => {
          itemProps.project.onChange?.(newValue);
          setValue("section", "");
        }}
      >
        {projects?.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.is_inbox ? "Inbox" : project.name}
            icon={project.is_inbox ? Icon.Tray : { source: Icon.CircleFilled, tintColor: colorHex(project.color) }}
          />
        ))}
      </Form.Dropdown>
      {sections && sections.length > 0 ? (
        <Form.Dropdown {...itemProps.section} title="Section">
          <Form.Dropdown.Item value="" title="No Section" />
          {sections.map((section) => (
            <Form.Dropdown.Item key={section.id} value={section.id} title={section.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      {labels && labels.length > 0 ? (
        <Form.TagPicker {...itemProps.labels} title="Labels">
          {labels.map((label) => (
            <Form.TagPicker.Item
              key={label.id}
              value={label.name}
              title={label.name}
              icon={{ source: Icon.Tag, tintColor: colorHex(label.color) }}
            />
          ))}
        </Form.TagPicker>
      ) : null}
      <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Notes (optional)" />
    </Form>
  );
}
