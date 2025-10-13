import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Chatbot, Conversation } from "./types";
import { format, formatDistanceToNow } from "date-fns";
import { filesize } from "filesize";

const { api_key } = getPreferenceValues<Preferences>();
const API_URL = "https://www.chatbase.co/api/v1/";
const headers = {
  Authorization: `Bearer ${api_key}`,
  Accept: "application/json",
};
const parseResponse = async (response: Response) => {
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result;
};
const options = {
  headers,
  parseResponse,
  initialData: [],
};
export default function Agents() {
  const { isLoading, data: chatbots } = useFetch(API_URL + "get-chatbots", {
    ...options,
    mapResult(result) {
      const { data, error } = (result as { chatbots: { error: string | null; data: Chatbot[] } }).chatbots;
      if (error) throw new Error(error);
      return {
        data,
      };
    },
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {chatbots.map((chatbot) => (
        <List.Item
          key={chatbot.id}
          icon={{ source: "placeholder.webp", tintColor: chatbot.styles.button_color }}
          title={chatbot.name}
          accessories={[
            {
              date: new Date(chatbot.last_trained_at),
              tooltip: `Last trained ${formatDistanceToNow(chatbot.last_trained_at, { addSuffix: true })}`,
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={`# Instructions (System prompt) \n\n---\n${chatbot.instructions}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />
                  <List.Item.Detail.Metadata.Label title="Agent ID" text={chatbot.id} />
                  <List.Item.Detail.Metadata.Label
                    title="Size"
                    text={filesize(chatbot.size, { round: 0, standard: "jedec" })}
                  />
                  <List.Item.Detail.Metadata.Label title="Name" text={chatbot.name} />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="AI" />
                  <List.Item.Detail.Metadata.TagList title="Model">
                    <List.Item.Detail.Metadata.TagList.Item text={chatbot.model} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Temperature" text={chatbot.temp.toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Training"
                    icon={Icon.Redo}
                    text={`Last trained at ${format(new Date(chatbot.last_trained_at), "MMMM dd, yyyy 'at' hh:mm a")}`}
                  />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Security" />
                  <List.Item.Detail.Metadata.TagList title="Visibility">
                    <List.Item.Detail.Metadata.TagList.Item text={chatbot.visibility} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Rate limit"
                    text={`Limit to ${chatbot.ip_limit} messages every ${chatbot.ip_limit_timeframe} seconds`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="Conversations" target={<Conversations chatbot={chatbot} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function generateConversationMarkdown(conversation: Conversation) {
  return conversation.messages
    .map((message) => (message.role === "assistant" ? `${message.content}\n\n---` : `> ${message.content}`))
    .join(`\n\n `);
}
function Conversations({ chatbot }: { chatbot: Chatbot }) {
  const {
    isLoading,
    data: conversations,
    pagination,
  } = useFetch(
    (options) =>
      API_URL +
      "get-conversations?" +
      new URLSearchParams({
        chatbotId: chatbot.id,
        size: "20",
        page: String(options.page + 1),
      }),
    {
      ...options,
      mapResult(result) {
        const { data } = result as { data: Conversation[] };
        return {
          data,
          hasMore: data.length === 20,
        };
      },
    },
  );

  return (
    <List
      navigationTitle={`Search Agents / ${chatbot.name} / Conversations`}
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
    >
      {!isLoading && !conversations.length ? (
        <List.EmptyView
          icon="ChatWithQuestionMarkIcon.svg"
          title="No chats found"
          description="Try adjusting your filters or check back later for new conversations."
        />
      ) : (
        conversations.map((conversation, conversationIndex) => (
          <List.Item
            key={conversation.id}
            icon={Icon.List}
            title={conversation.messages.at(-1)?.content || conversationIndex.toString()}
            detail={<List.Item.Detail markdown={generateConversationMarkdown(conversation)} />}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Message} title="Messages" target={<Messages conversation={conversation} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function Messages({ conversation }: { conversation: Conversation }) {
  return (
    <List navigationTitle={`Conversations / ${conversation.id} / Messages`} isShowingDetail>
      {conversation.messages.map((message, messageIndex) => (
        <List.Item
          key={conversation.id + messageIndex}
          icon={Icon.Message}
          title={message.content}
          detail={<List.Item.Detail markdown={`**${message.role.toUpperCase()}**: ${message.content}`} />}
        />
      ))}
    </List>
  );
}
