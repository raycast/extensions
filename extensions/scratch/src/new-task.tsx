import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { createTask, getErrorMessage } from "./api/scratch";

type TaskFormValues = {
  title: string;
  description: string;
  link: string;
  waitingFor: string;
  date: string;
  bucket: "" | "anytime" | "someday";
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export default function NewTaskCommand() {
  const { handleSubmit, itemProps } = useForm<TaskFormValues>({
    async onSubmit(values) {
      await submit(values);
    },
    validation: {
      title: FormValidation.Required,
      date: (value) => {
        if (!value || value.trim() === "") {
          return undefined;
        }

        return isoDatePattern.test(value.trim()) ? undefined : "Use YYYY-MM-DD";
      },
      link: (value) => {
        if (!value || value.trim() === "") {
          return undefined;
        }

        try {
          new URL(value.trim());
          return undefined;
        } catch {
          return "Enter a valid URL";
        }
      },
    },
    initialValues: {
      title: "",
      description: "",
      link: "",
      waitingFor: "",
      date: "",
      bucket: "",
    },
  });

  async function submit(values: TaskFormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task",
    });

    try {
      const task = await createTask({
        title: values.title,
        description: values.description,
        link: values.link,
        waitingFor: values.waitingFor,
        date: values.date,
        bucket: values.bucket || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.message = task.title;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create task";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField autoFocus id="title" title="Title" placeholder="Follow up with design" {...itemProps.title} />
      <Form.TextArea id="description" title="Description" placeholder="Optional" {...itemProps.description} />
      <Form.TextField id="link" title="Link" placeholder="Optional URL" {...itemProps.link} />
      <Form.TextField id="waitingFor" title="Waiting For" placeholder="Optional" {...itemProps.waitingFor} />
      <Form.TextField id="date" title="Date" placeholder="Optional YYYY-MM-DD" {...itemProps.date} />
      <Form.Dropdown id="bucket" title="Bucket" {...itemProps.bucket}>
        <Form.Dropdown.Item value="" title="Inbox" />
        <Form.Dropdown.Item value="anytime" title="Anytime" />
        <Form.Dropdown.Item value="someday" title="Someday" />
      </Form.Dropdown>
      <Form.Description text="If a date is set, the schedule bucket is ignored." />
    </Form>
  );
}
