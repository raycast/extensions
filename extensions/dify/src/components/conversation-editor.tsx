import { useForm } from "@raycast/utils";
import { useState } from "react";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";

interface EditConversationValues {
  conversationText: string;
}

interface EditConversationProps {
  initialText: string;
  onSave: (text: string) => void;
}

export function ConversationEditor({ initialText, onSave }: EditConversationProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<EditConversationValues>({
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        onSave(values.conversationText);
        showToast({
          style: Toast.Style.Success,
          title: "Saved Successfully",
          message: "Conversation has been updated",
        });
        pop();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Save Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    initialValues: {
      conversationText: initialText,
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Conversation Content"
        placeholder="Edit conversation content..."
        {...itemProps.conversationText}
        enableMarkdown
      />
    </Form>
  );
}
