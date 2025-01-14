import { ActionPanel, clearSearchBar, Icon, List } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { DestructiveAction, PrimaryAction } from "../actions";
import { CopyActionSection } from "../actions/copy";
import { FormInputActionSection } from "../actions/form-input";
import { PreferencesActionSection } from "../actions/preferences";
import { SaveActionSection } from "../actions/save";
import { useSavedChat } from "../hooks/useSavedChat";
import { Chat, ChatViewProps } from "../type";
import { EmptyView } from "./empty";
import { useMcp } from "../hooks/useMcp";

export const ChatView = ({
  data,
  question,
  model,
  setConversation,
  use,
  models,
  selectedModel,
  onModelChange,
}: ChatViewProps) => {
  const savedChat = useSavedChat();
  const { isConnecting } = useMcp();

  const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderMessages = (chat: Chat, streamData?: Chat) => {
    const messages = streamData?.id === chat.id ? streamData.messages : chat.messages;
    const markdown = messages
      .map((msg) => {
        switch (msg.type) {
          case "user":
            return `_${msg.content.trim()}_\n\n---\n\n`;
          case "assistant":
            return `${msg.content}\n\n`;

          case "tool_call":
            return `\`\`\`\nλ ${JSON.parse(msg.content).name} `;
          case "tool_result":
            return `=> ${msg.content.length} bytes\n\`\`\`\n\n`;

          // case "tool_call":
          //   return `\`\`\`\n${msg.content}\n`;
          // case "tool_result":
          //   return `\n=> ${msg.content}\n\`\`\`\n\n`;

          default:
            return "";
        }
      })
      .join("");
    return markdown;
  };

  const getActionPanel = (selectedChat: Chat) => {
    return (
      <ActionPanel>
        {question.length > 0 ? (
          <PrimaryAction title="Get Answer" onAction={() => use.chats.ask(question, model)} />
        ) : (selectedChat.question || selectedChat.messages.length > 0) &&
          use.chats.selectedChatId === selectedChat.id ? (
          <>
            <CopyActionSection chat={selectedChat} />
            {selectedChat.messages.length > 0 ? (
              <SaveActionSection onSaveAnswerAction={() => savedChat.add(selectedChat)} />
            ) : null}
            <ActionPanel.Section title="Output"></ActionPanel.Section>
          </>
        ) : null}
        <FormInputActionSection
          initialQuestion={question}
          onSubmit={(question) => use.chats.ask(question, model)}
          models={models}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
        {use.chats.data.length > 0 && (
          <ActionPanel.Section title="Restart">
            <DestructiveAction
              title="Start New Conversation"
              icon={Icon.RotateAntiClockwise}
              dialog={{
                title: "Are you sure you want to start a new conversation?",
                primaryButton: "Start New",
              }}
              onAction={() => {
                setConversation({
                  id: uuidv4(),
                  chats: [],
                  model: model,
                  pinned: false,
                  updated_at: "",
                  created_at: new Date().toISOString(),
                });
                use.chats.clear();
                clearSearchBar();
                use.chats.setLoading(false);
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>
        )}
        <PreferencesActionSection />
      </ActionPanel>
    );
  };

  return sortedChats.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="Results" subtitle={data.length.toLocaleString()}>
      {sortedChats.map((sortedChat, i) => {
        return (
          <List.Item
            id={sortedChat.id}
            key={sortedChat.id}
            accessories={[
              {
                text: `#${use.chats.data.length - i}`,
              },
            ]}
            title={sortedChat.question}
            detail={<List.Item.Detail markdown={renderMessages(sortedChat, use.chats.streamData)} />}
            actions={use.chats.isLoading ? undefined : getActionPanel(sortedChat)}
          />
        );
      })}
    </List.Section>
  );
};
