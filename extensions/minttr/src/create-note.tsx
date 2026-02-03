import {
  Action,
  ActionPanel,
  Form,
  PopToRootType,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { createNote } from "./lib/api";

interface NoteFormValues {
  content: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<NoteFormValues>({
    async onSubmit(values) {
      await showToast({
        title: "Creating note...",
        style: Toast.Style.Animated,
      });

      const result = await createNote({ content: values.content });

      if (!result.success) {
        await showToast({
          title: "Failed to create note",
          message: result.error,
          style: Toast.Style.Failure,
        });
        return;
      }

      await showHUD("Note created", { popToRootType: PopToRootType.Immediate });
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.content}
        title=""
        placeholder="What's on your mind"
        enableMarkdown
      />
    </Form>
  );
}
