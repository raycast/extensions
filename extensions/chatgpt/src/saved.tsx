import { AuthGate } from "./views/auth-required";
import { ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { DestructiveAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { useSavedChat } from "./hooks/useSavedChat";
import { Chat } from "./type";
import { uniqueById } from "./utils";
import { AnswerDetailView } from "./views/answer-detail";

export default function Saved() {
  return (
    <AuthGate>
      <SavedContent />
    </AuthGate>
  );
}

function SavedContent() {
  const savedChat = useSavedChat();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const getActionPanel = (chat: Chat) => (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={chat.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Unsave"
          dialog={{
            title: "Are you sure you want to unsave this answer from your collection?",
          }}
          onAction={() => savedChat.remove(chat)}
        />
        <DestructiveAction
          title="Clear All"
          dialog={{
            title: "Are you sure you want to clear all your saved answer from your collection?",
          }}
          onAction={() => savedChat.clear()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sorted = useMemo(
    () =>
      uniqueById(
        [...savedChat.data].sort((a, b) => (Date.parse(b.saved_at ?? "") || 0) - (Date.parse(a.saved_at ?? "") || 0)),
      ),
    [savedChat.data],
  );
  const query = searchText.toLowerCase();
  const filtered = query
    ? sorted.filter((item) => item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query))
    : sorted;
  const detailId = filtered.find((item) => item.id === selectedAnswerId)?.id ?? filtered[0]?.id;

  return (
    <List
      isShowingDetail={filtered.length === 0 ? false : true}
      isLoading={savedChat.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedAnswerId) {
          setSelectedAnswerId(id);
        }
      }}
      searchBarPlaceholder="Search saved answer/question..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {savedChat.data.length === 0 ? (
        <List.EmptyView
          title="No saved answers"
          description="Save generated question with ⌘ + S shortcut"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Saved" subtitle={filtered.length.toLocaleString()}>
          {filtered.map((chat) => (
            <List.Item
              id={chat.id}
              key={chat.id}
              title={chat.question}
              accessories={[{ text: new Date(chat.created_at ?? 0).toLocaleDateString() }]}
              detail={chat.id === detailId ? <AnswerDetailView chat={chat} /> : undefined}
              actions={chat && selectedAnswerId === chat.id ? getActionPanel(chat) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
