import { FormValidation, useForm } from "@raycast/utils";
import { useConversations } from "../../hooks/useConversations";
import { useState } from "react";
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

  // Derived state (Rule 1): find conversation from loaded data
  const conversation = conversations.find((c) => c.id === conversationId) ?? null;

  if (isLoadingConversations) {
    return (
      <Form isLoading={true}>
        <Form.TextField title="Title" placeholder="Loading..." id="title" />
      </Form>
    );
  }

  if (!conversation) {
    return (
      <Form>
        <Form.Description title="Conversation" text="Conversation not found." />
      </Form>
    );
  }

  // Rule 4: mount the real form only when data is ready
  return <ConversationFormReady conversation={conversation} updateConversation={updateConversation} pop={pop} />;
}

interface ConversationFormReadyProps {
  conversation: { id: string; title: string; createdAt: string; questions?: unknown[] } | null;
  updateConversation: (conversation: { id: string; title: string; createdAt: string }) => Promise<void>;
  pop: () => void;
}

function ConversationFormReady({ conversation, updateConversation, pop }: ConversationFormReadyProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<ConversationFormValues>({
    initialValues: {
      title: conversation?.title ?? "",
    },
    async onSubmit(values) {
      setIsLoading(true);
      try {
        if (conversation) {
          await updateConversation({
            id: conversation.id,
            createdAt: conversation.createdAt,
            title: values.title,
          });
        }
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Conversation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField title="Title" placeholder="Enter conversation title" {...itemProps.title} />
    </Form>
  );
}
