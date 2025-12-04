import { ActionPanel, Icon, List } from "@raycast/api";
import { useSavedChat } from "./hooks/useSavedChat";
import { useHistory } from "./hooks/useHistory";
import { useState } from "react";
import { AnswerDetailView } from "./views/answer-detail";
import { Chat } from "./type";
import { CopyActionSection } from "./actions/copy";
import { DestructiveAction, TextToSpeechAction } from "./actions";
import { SaveActionSection } from "./actions/save";

export default function History() {
  const savedChat = useSavedChat();
  const history = useHistory();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const sortedHistory = history.data.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
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

  const getActionPanel = (chat: Chat) => {
    return (
      <ActionPanel>
        <CopyActionSection question={chat.question} answer={chat.answer} />
        <SaveActionSection
          onSaveAnswerAction={() => {
            savedChat.add(chat);
          }}
        />
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
      </ActionPanel>
    );
  };

  return (
    <List
      isShowingDetail={filteredHistory.length !== 0}
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
        <List.EmptyView
          title="No history"
          description="Your recent questions will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((answer) => {
            return (
              <List.Item
                title={answer.question}
                id={answer.id}
                key={answer.id}
                // icon={getAvatarIcon(answer.question)}
                accessories={[{ text: new Date(answer.created_at ?? 0).toLocaleDateString() }]}
                detail={<AnswerDetailView chat={answer} />}
                actions={answer && selectedAnswerId === answer.id ? getActionPanel(answer) : undefined}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
