import { DestructiveAction } from "./actions/Destructive";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { useHistory } from "./hooks/useHistory";
// import React from "react";
import { encode } from "./libs/encoder";
import { Chat } from "./types";
import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useState } from "react";

export default function History() {
  const history = useHistory();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isHideMeta, setIsHideMeta] = useState<boolean>(false);
  const getActionPanel = (chat: Chat) => (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <Action
        title="Toggle Meta"
        onAction={() => setIsHideMeta(!isHideMeta)}
        shortcut={{ modifiers: ["ctrl"], key: "b" }}
      />
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
        <List.EmptyView
          title="No history"
          description="Your recent questions will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((chat) => {
            const questionToken = encode(chat.question).length;
            const answerToken = encode(chat.answer).length;
            return (
              <List.Item
                id={chat.id}
                key={chat.id}
                title={chat.question}
                accessories={[{ text: new Date(chat.created_at ?? 0).toLocaleDateString() }]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${chat.question}\n\n${chat.answer}`}
                    metadata={
                      isHideMeta ? undefined : (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Model">
                            <List.Item.Detail.Metadata.TagList.Item text={chat.model} color={"#eed535"} />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label
                            title={"Date"}
                            text={new Date(chat.created_at).toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title={"Question Token Count"}
                            icon="model"
                            text={questionToken.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title={"Answer Token Count"}
                            icon="model"
                            text={answerToken.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title={"Total Token Count"}
                            icon="model"
                            text={(answerToken + questionToken).toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title={"Id"} text={chat.id} />
                          <List.Item.Detail.Metadata.Label title={"Conversaton Id"} text={chat.conversationId} />
                        </List.Item.Detail.Metadata>
                      )
                    }
                  />
                }
                actions={chat && selectedAnswerId === chat.id ? getActionPanel(chat) : undefined}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
