import { Form, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
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
          title: "Memo Saved",
          message: "Your memo has been saved successfully",
        });
        await popToRoot();
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to save memo",
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
