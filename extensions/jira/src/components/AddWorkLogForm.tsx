import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { AddWorkLog, Issue } from "../api/issues";
import { getErrorMessage } from "../helpers/errors";

export type AddWorkLogFormValues = {
  time: string;
  startDate: Date;
  comment: string;
};

type AddWorkLogFormProps = {
  issue: Issue;
};

export function AddWorkLogForm({ issue }: AddWorkLogFormProps) {
  const { handleSubmit } = useForm<AddWorkLogFormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

      try {
        await AddWorkLog(issue.id, values);

        toast.style = Toast.Style.Success;
        toast.title = "Work log added successfully";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed adding work log";
        toast.message = getErrorMessage(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Work Log" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" title="Time" placeholder="3.5h" />

      <Form.DatePicker id="startDate" title="Date" />

      <Form.TextArea id="description" title="Log Description" placeholder="Add a description" />
    </Form>
  );
}
