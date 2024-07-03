import { Action, ActionPanel, Alert, confirmAlert, clearSearchBar, Icon, List, useNavigation } from "@raycast/api";
import { ChatViewPropsType } from "../../type/chat";
import { AnswerDetailView } from "./detail";
import { EmptyView } from "../empty";
import { ChatFullForm } from "./form";
import say from "say";
import { GetNewConversation } from "../../type/conversation";
import { TalkType } from "../../type/talk";

export const ChatView = ({
  data,
  question,
  conversation,
  setConversation,
  use,
  selectedAssistant,
}: ChatViewPropsType) => {
  const { push } = useNavigation();
  const sortedChats = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const CopyToClipboardAction = (props: Action.CopyToClipboard.Props) => (
    <Action.CopyToClipboard icon={Icon.CopyClipboard} {...props} />
  );

  const TextToSpeechAction = ({ content }: { content: string }) => (
    <Action
      icon={Icon.SpeechBubble}
      title="Speak"
      onAction={() => {
        say.stop();
        say.speak(content);
      }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    />
  );

  const getActionPanel = (selectedChat: TalkType) => (
    <ActionPanel>
      {question.length > 0 ? (
        <Action
          title="Get Answer"
          icon={Icon.ArrowRight}
          onAction={() => use.chats.ask(question, undefined, conversation)}
        />
      ) : selectedChat.result?.text && use.chats.selectedChatId === selectedChat.chatId ? (
        <>
          <ActionPanel.Section title="Copy">
            <CopyToClipboardAction title="Copy Answer" content={selectedChat.result.text} />
            <CopyToClipboardAction title="Copy Question" content={selectedChat.question} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Output">
            <TextToSpeechAction content={selectedChat.result.text} />
          </ActionPanel.Section>
        </>
      ) : null}
      <ActionPanel.Section title="Input">
        <Action
          title="Full Text Input"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          icon={Icon.Text}
          onAction={() => {
            push(
              <ChatFullForm
                initialQuestion={question}
                onSubmit={(question: string, file: string[] | undefined) => use.chats.ask(question, file, conversation)}
              />
            );
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Restart">
        <Action
          style={Action.Style.Destructive}
          icon={Icon.RotateAntiClockwise}
          title="Start New Conversation"
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure you want to start a new conversation?",
              message: "This action cannot be undone",
              icon: Icon.RotateAntiClockwise,
              primaryAction: {
                title: "Start New",
                style: Alert.ActionStyle.Destructive,
                onAction: () => {
                  setConversation(GetNewConversation(selectedAssistant, true));
                  use.chats.clear();
                  clearSearchBar();
                  use.chats.setLoading(false);
                },
              },
            });
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return sortedChats.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="History" subtitle={data.length.toLocaleString()}>
      {sortedChats.map((sc: TalkType, i) => {
        return (
          <List.Item
            id={sc.chatId}
            key={sc.chatId}
            accessories={[{ text: `#${sortedChats.length - i}` }]}
            title={sc.question.text}
            detail={sc && <AnswerDetailView chat={sc} streamData={use.chats.streamData} />}
            actions={use.chats.isLoading ? undefined : getActionPanel(sc)}
          />
        );
      })}
    </List.Section>
  );
};
