import { FormValidation, getAvatarIcon, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";
import { Conversation, Message, MessageType } from "./types";

const MESSAGE_STATUS_ACCESSORY: Record<Message["status"], List.Item.Accessory> = {
  read: { icon: { source: Icon.Checkmark, tintColor: Color.Blue }, tooltip: "Read" },
  sent: { icon: Icon.Checkmark, tooltip: "Delivered successfully" },
  failed: { icon: { source: Icon.Warning, tintColor: Color.Red } },
  delivered: {},
};
export default function ListConversations() {
  const [filter, setFilter] = useCachedState("LIST_CONVERSATIONS_FILTER", "status_open");
  const {
    isLoading,
    data: conversations,
    mutate,
  } = useCachedPromise(
    async (filter: string) => {
      const [, val] = filter.split("_");
      const { data } = await chatwoot.conversations.list({ status: val });
      return data.payload;
    },
    [filter],
    { initialData: [] },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter} defaultValue={filter}>
          <List.Dropdown.Item title="All" value="status_all" />
          <List.Dropdown.Item title="Open" value="status_open" />
          <List.Dropdown.Item title="Resolved" value="status_resolved" />
          <List.Dropdown.Item title="Pending" value="status_pending" />
          <List.Dropdown.Item title="Snoozed" value="status_snoozed" />
        </List.Dropdown>
      }
    >
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
              MESSAGE_STATUS_ACCESSORY[conversation.messages[0].status],
              {
                tag: {
                  value: conversation.status,
                  color: conversation.status === "snoozed" ? Color.Yellow : undefined,
                },
                tooltip:
                  conversation.status === "snoozed"
                    ? `Snoozed until ${conversation.snoozed_until ? formatDistanceToNow(conversation.snoozed_until) : "next reply"}`
                    : "",
              },
              {
                icon: `number-${String(conversation.unread_count > 99 ? 99 : conversation.unread_count).padStart(2, "0")}-16`,
                tooltip: `${conversation.unread_count} unread`,
              },
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
                  target={<CreateMessage conversationId={conversation.id} />}
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

const getMessageIcon = (message: Message) => {
  switch (message.message_type) {
    case MessageType.Activity:
      return "chatwoot.png";
    case MessageType.Bot:
      return getAvatarIcon("B");
    default:
      return getAvatarIcon(message.sender.name);
  }
};
function ListMessages({ conversation }: { conversation: Conversation }) {
  const {
    isLoading,
    data: messages,
    mutate,
  } = useCachedPromise(
    async (conversationId) => {
      const { payload } = await chatwoot.messages.list({ conversationId });
      return payload;
    },
    [conversation.id],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`List Conversations / ${conversation.id} / Messages`}>
      {messages.map((message) => (
        <List.Item
          key={message.id}
          icon={getMessageIcon(message)}
          title=""
          subtitle={message.content ? "" : "No content available"}
          accessories={[
            { icon: message.private ? Icon.Lock : undefined },
            { text: format(new Date(message.created_at * 1000), "MMM d, h:mm a") },
            MESSAGE_STATUS_ACCESSORY[message.status],
          ]}
          detail={<List.Item.Detail markdown={message.content} />}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.SpeechBubbleActive}
                title="Create Message"
                target={
                  <CreateMessage conversationId={conversation.id} lastMessageContent={messages.at(-1)?.content} />
                }
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function CreateMessage({
  conversationId,
  lastMessageContent,
}: {
  conversationId: number;
  lastMessageContent?: string | null;
}) {
  const { pop } = useNavigation();
  type FormValues = {
    private: boolean;
    content: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, values.private ? "Adding" : "Sending", values.content);
      try {
        await chatwoot.messages.create({ conversationId, message: values });
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
      navigationTitle={`List Conversations / ${conversationId} / ${values.private ? "Add Note" : "Send"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubbleActive} title="Create Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Last Message" text={lastMessageContent || ""} />
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
