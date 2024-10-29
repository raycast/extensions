import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { MemoStorage } from "./storage/memo-storage";

interface CreateMemoForm {
  title: string;
  desc: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<CreateMemoForm>({
    onSubmit: async (values) => {
      try {
        await MemoStorage.createMemo(values.title, values.desc);
        await showToast({
          style: Toast.Style.Success,
          title: "Memo saved successfully",
        });
        await popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save memo",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    validation: {
      title: FormValidation.Required,
      desc: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Memo Title" />
      <Form.TextArea
        {...itemProps.desc}
        title="Description"
        placeholder="Memo Content (e.g: **bold**)"
        enableMarkdown
      />
    </Form>
  );
}
