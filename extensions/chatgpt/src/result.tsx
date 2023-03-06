import { Action, ActionPanel, clearSearchBar, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { ChatCompletionRequestMessage } from "openai";
import { useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { DestructiveAction, GetAnswerAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { SaveActionSection } from "./actions/save";
import { FullTextInput } from "./components/FullTextInput";
import { useAutoTTS } from "./hooks/useAutoTTS";
import { useChatGPT } from "./hooks/useChatGPT";
import { useHistory } from "./hooks/useHistory";
import { useRecentQuestion } from "./hooks/useRecentQuestion";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat, Question } from "./type";
import { AnswerDetailView } from "./views/answer-detail";
import { EmptyView } from "./views/empty";

export default function ChatGPT() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const { add: addHistory } = useHistory();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const savedChat = useSavedChat();
  const recentQuestion = useRecentQuestion();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const chatGPT = useChatGPT();
  const isAutoTTS = useAutoTTS();

  const { pop, push } = useNavigation();

  async function getAnswer(question: string) {
    setIsLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    if (chats.length === 0) {
      const initialQuestion: Question = {
        id: uuidv4(),
        question: chat.question,
        created_at: chat.created_at,
      };
      recentQuestion.add(initialQuestion);
    }

    // Add new answer
    setChats((prev) => {
      return [...prev, chat];
    });

    // Weird selection glitch workaround
    setTimeout(async () => {
      setSelectedChatId(chat.id);
    }, 30);

    await chatGPT
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [...messages, { role: "user", content: question }],
      })
      .then((res) => {
        chat = { ...chat, answer: res.data.choices.map((x) => x.message)[0]?.content ?? "" };
        if (typeof chat.answer === "string") {
          setIsLoading(false);
          clearSearchBar();

          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;

          if (isAutoTTS) {
            say.stop();
            say.speak(chat.answer);
          }
          setMessages((prev) => {
            return [...prev, { role: "assistant", content: chat.answer }];
          });
          setChats((prev) => {
            return prev.map((a) => {
              if (a.id === chat.id) {
                return chat;
              }
              return a;
            });
          });

          addHistory(chat);
        }
      })
      .catch((err) => {
        toast.title = "Error";
        if (err instanceof Error) {
          toast.message = err?.message;
        }
        toast.style = Toast.Style.Failure;
      });
  }

  const getActionPanel = (chat?: Chat) => (
    <ActionPanel>
      {searchText.length > 0 ? (
        <>
          <GetAnswerAction onAction={() => getAnswer(searchText)} />
        </>
      ) : chat?.answer && selectedChatId === chat.id ? (
        <>
          <CopyActionSection answer={chat.answer} question={chat.question} />
          <SaveActionSection
            onSaveAnswerAction={() => savedChat.add(chat)}
            snippet={{ text: chat.answer, name: chat.question }}
          />
          <ActionPanel.Section title="Output">
            <TextToSpeechAction content={chat.answer} />
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
              <FullTextInput
                onSubmit={(text) => {
                  getAnswer(text);
                  pop();
                }}
              />
            );
          }}
        />
      </ActionPanel.Section>
      {chats.length > 0 && (
        <ActionPanel.Section title="Restart">
          <DestructiveAction
            title="Start New Conversation"
            icon={Icon.RotateAntiClockwise}
            dialog={{
              title: "Are you sure you want to start a new conversation?",
              primaryButton: "Start New",
            }}
            onAction={() => {
              setChats([]);
              clearSearchBar();
              setIsLoading(false);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
        </ActionPanel.Section>
      )}
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedRecentQuestions = recentQuestion.data.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const unduplicatedReecentQuestions = sortedRecentQuestions.filter(
    (value, index, self) => index === self.findIndex((answer) => answer.question === value.question)
  );

  const sortedChats = chats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <List
      isShowingDetail={chats.length > 0 ? true : false}
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle={false}
      navigationTitle={"ChatGPT"}
      actions={getActionPanel()}
      selectedItemId={selectedChatId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedChatId) {
          setSelectedChatId(id);
        }
      }}
      searchBarPlaceholder={chats.length > 0 ? "Ask another question..." : "Ask a question..."}
    >
      {searchText.length === 0 && chats.length === 0 ? (
        recentQuestion.data.length > 0 ? (
          <List.Section title="Recent questions" subtitle={recentQuestion.data.length.toLocaleString()}>
            {unduplicatedReecentQuestions.map((question) => {
              return (
                <List.Item
                  id={question.id}
                  key={question.id}
                  accessories={[{ text: new Date(question.created_at ?? 0).toLocaleString() }]}
                  title={question.question}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Ask">
                        <GetAnswerAction onAction={() => getAnswer(question.question)} />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Remove">
                        <DestructiveAction
                          title="Clear History"
                          dialog={{ title: "Are you sure you to clear your recent question?" }}
                          onAction={() => recentQuestion.clear()}
                        />
                      </ActionPanel.Section>
                      <PreferencesActionSection />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ) : (
          <EmptyView />
        )
      ) : chats.length === 0 ? (
        <EmptyView />
      ) : (
        <List.Section title="Results" subtitle={chats.length.toLocaleString()}>
          {sortedChats.map((chat, i) => {
            const markdown = `**${chat.question}**\n\n${chat.answer}`;
            return (
              <List.Item
                id={chat.id}
                key={chat.id}
                accessories={[{ text: `#${chats.length - i}` }]}
                title={chat.question}
                detail={chat.answer && <AnswerDetailView chat={chat} markdown={markdown} />}
                actions={isLoading ? undefined : getActionPanel(chat)}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
