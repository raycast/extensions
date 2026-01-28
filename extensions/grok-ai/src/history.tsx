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

const HistoryActionPanel = ({ chat, onRemove, onClear }: { chat: Chat; onRemove: () => void; onClear: () => void }) => {
  const savedChat = useSavedChat();

  return (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <SaveActionSection onSaveAnswerAction={() => savedChat.add(chat)} />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={chat.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove"
          dialog={{ title: "Are you sure you want to remove this answer from your history?" }}
          onAction={onRemove}
        />
        <DestructiveAction
          title="Clear History"
          dialog={{ title: "Are you sure you want to clear your history?" }}
          onAction={onClear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );
};

export default function History() {
  const history = useHistory();
  const [searchText, setSearchText] = useState("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const filteredHistory = history.data
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .filter((value, index, self) => index === self.findIndex((h) => h.id === value.id))
    .filter(
      (answer) =>
        !searchText ||
        answer.question.toLowerCase().includes(searchText.toLowerCase()) ||
        answer.answer.toLowerCase().includes(searchText.toLowerCase()),
    );

  return (
    <List
      isShowingDetail={filteredHistory.length > 0}
      isLoading={history.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={(id) => id !== selectedAnswerId && setSelectedAnswerId(id)}
      searchBarPlaceholder="Search answer/question..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.data.length === 0 ? (
        <List.EmptyView
          title="No history"
          description="Your recent questions will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((answer) => (
            <List.Item
              id={answer.id}
              key={answer.id}
              title={answer.question}
              accessories={[{ text: new Date(answer.created_at ?? 0).toLocaleDateString() }]}
              detail={<AnswerDetailView chat={answer} />}
              actions={
                answer && selectedAnswerId === answer.id ? (
                  <HistoryActionPanel
                    chat={answer}
                    onRemove={() => history.remove(answer)}
                    onClear={() => history.clear()}
                  />
                ) : undefined
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
