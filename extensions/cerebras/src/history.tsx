import { ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { DestructiveAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { SaveActionSection } from "./actions/save";
import { useHistory } from "./hooks/useHistory";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat } from "./type";
import { AnswerDetailView } from "./views/answer-detail";

export default function History() {
  const savedChat = useSavedChat();
  const history = useHistory();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const getActionPanel = (chat: Chat) => (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <SaveActionSection onSaveAnswerAction={() => savedChat.add(chat)} />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={chat.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove"
          dialog={{
            title: "Are you sure you want to remove this answer from your history?",
          }}
          onAction={() => history.remove(chat)}
        />
        <DestructiveAction
          title="Clear History"
          dialog={{
            title: "Are you sure you want to clear your history?",
          }}
          onAction={() => history.clear()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedHistory = history.data.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );

  const filteredHistory = sortedHistory
    .filter((value, index, self) => index === self.findIndex((history) => history.id === value.id))
    .filter((answer) => {
      if (searchText === "") {
        return true;
      }
      return (
        answer.question.toLowerCase().includes(searchText.toLowerCase()) ||
        answer.answer.toLowerCase().includes(searchText.toLowerCase())
      );
    });

  return (
    <List
      isShowingDetail={filteredHistory.length === 0 ? false : true}
      isLoading={history.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedAnswerId) {
          setSelectedAnswerId(id);
        }
      }}
      searchBarPlaceholder="Search answer/question..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.data.length === 0 ? (
        <List.EmptyView title="No history" description="Your recent questions will show up here" icon={Icon.Stars} />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((answer) => (
            <List.Item
              id={answer.id}
              key={answer.id}
              title={answer.question}
              accessories={[{ text: new Date(answer.created_at ?? 0).toLocaleDateString() }]}
              detail={<AnswerDetailView chat={answer} />}
              actions={answer && selectedAnswerId === answer.id ? getActionPanel(answer) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
