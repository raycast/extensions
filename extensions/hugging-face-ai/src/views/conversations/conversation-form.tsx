import { FormValidation, useForm } from "@raycast/utils";
import { useConversations } from "../../hooks/useConversations";
import { useEffect, useState } from "react";
import { Conversation } from "../../types/conversation";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

interface ConversationFormValues {
  title: string;
}

interface ConversationFormProps {
  conversationId: string;
}

export default function ConversationForm({ conversationId }: ConversationFormProps) {
  const { pop } = useNavigation();

  const { data: conversations, update: updateConversation, isLoading: isLoadingConversations } = useConversations();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps, reset } = useForm<ConversationFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        if (conversation) {
          await updateConversation({ ...conversation, title: values.title });
        }
        // Pop form from stack (navigating to conversations)
        pop();
      } catch (error) {
        console.error("Error updating conversation:", error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (isLoadingConversations) {
      return;
    }

    (async () => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        // Update state and prefill the form
        setConversation(conversation);
        reset({
          title: conversation.title,
        });
      }

      setIsLoading(false);
    })();
  }, [isLoadingConversations, conversationId, reset]);

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoadingConversations && <Action.SubmitForm title="Update Conversation" onSubmit={handleSubmit} />}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField title="Title" placeholder="Enter conversation title" {...itemProps.title} />
    </Form>
  );
}
