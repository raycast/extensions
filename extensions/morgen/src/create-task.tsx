import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { type FC } from "react";
import { createTask } from "./lib/api";
import type { CreateTaskInput } from "./lib/types";

type FormValues = {
  title: string;
  description: string;
  due: Date | null;
  priority: string;
};

const PRIORITY_OPTIONS: Array<{ title: string; value: string }> = [
  { title: "High", value: "1" },
  { title: "Medium", value: "5" },
  { title: "Normal", value: "0" },
  { title: "Low", value: "9" },
];

function formatDueLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

const CreateTask: FC = () => {
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      try {
        const body: CreateTaskInput = { title: values.title.trim() };

        const description = values.description?.trim();
        if (description) body.description = description;

        if (values.due) {
          body.due = formatDueLocal(values.due);
          body.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        const priority = Number.parseInt(values.priority ?? "0", 10);
        if (Number.isFinite(priority) && priority > 0) body.priority = priority;

        await createTask(body);

        toast.style = Toast.Style.Success;
        toast.title = "Task created in Inbox";
        reset({ title: "", description: "", due: null, priority: "0" });
        await popToRoot({ clearSearchBar: true });
      } catch (error) {
        toast.hide();
        await showFailureToast(error, { title: "Could not create task" });
      }
    },
    initialValues: {
      title: "",
      description: "",
      due: null,
      priority: "0",
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="What needs to be done?" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Optional details" {...itemProps.description} />
      <Form.DatePicker title="Due" {...itemProps.due} />
      <Form.Dropdown title="Importance" {...itemProps.priority}>
        {PRIORITY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export default CreateTask;
