import { FormValidation, getAvatarIcon, useCachedPromise, useForm } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";
import { Conversation, MessageType } from "./types";

export default function ListConversations() {
  const {
    isLoading,
    data: conversations,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await chatwoot.conversations.list();
      return data.payload;
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !conversations.length ? (
        <List.EmptyView title="There are no active conversations in this group." />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            icon={getAvatarIcon(conversation.meta.sender.name)}
            title={conversation.meta.sender.name}
            subtitle={
              (conversation.messages[0].private
                ? "🔒"
                : conversation.messages[0].message_type === MessageType.Outgoing
                  ? "↰"
                  : "") + (conversation.messages[0].content || "No content available")
            }
            accessories={[
              conversation.meta.sender.email
                ? {}
                : {
                    icon: { source: Icon.Warning, tintColor: Color.Yellow },
                    tooltip: "The identity of this user is not verified",
                  },
              {
                date: new Date(conversation.created_at * 1000),
                tooltip: `Created ${formatDistanceToNow(new Date(conversation.created_at * 1000), { addSuffix: true })}`,
              },
              {
                date: new Date(conversation.last_activity_at * 1000),
                tooltip: `Last activity ${formatDistanceToNow(new Date(conversation.last_activity_at * 1000), { addSuffix: true })}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Bubble}
                  title="List Messages"
                  target={<ListMessages conversation={conversation} />}
                  onPop={mutate}
                />
                <Action.Push
                  icon={Icon.SpeechBubbleActive}
                  title="Create Message"
                  target={<CreateMessage conversation={conversation} />}
                  onPop={mutate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ListMessages({ conversation }: { conversation: Conversation }) {
  const {
    isLoading,
    data: messages,
    mutate,
  } = useCachedPromise(
    async () => {
      const { payload } = await chatwoot.messages.list({ conversationId: conversation.id });
      return payload;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`List Conversations / ${conversation.id} / Messages`}>
      {messages.map((message) => (
        <List.Item
          key={message.id}
          icon={getAvatarIcon(message.message_type === MessageType.Bot ? "B" : message.sender.name)}
          title={message.content || ""}
          subtitle={message.content ? "" : "No content available"}
          accessories={[
            { icon: message.private ? Icon.Lock : undefined },
            { text: format(new Date(message.created_at * 1000), "MMM d, h:mm a") },
          ]}
          detail={<List.Item.Detail markdown={message.content} />}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.SpeechBubbleActive}
                title="Create Message"
                target={<CreateMessage conversation={conversation} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function CreateMessage({ conversation }: { conversation: Conversation }) {
  const { pop } = useNavigation();
  type FormValues = {
    private: boolean;
    content: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, values.private ? "Adding" : "Sending", values.content);
      try {
        await chatwoot.messages.create({ conversationId: conversation.id, message: values });
        toast.style = Toast.Style.Success;
        toast.title = values.private ? "Added" : "Sent";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`List Conversations / ${conversation.id} / ${values.private ? "Add Note" : "Send"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubbleActive} title="Create Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox label="Private Note" {...itemProps.private} />
      <Form.TextArea
        title="Content"
        placeholder={values.private ? "This will be visible only to Agents" : ""}
        autoFocus
        {...itemProps.content}
      />
    </Form>
  );
}
