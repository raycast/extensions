import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
// import { DestructiveAction, TextToSpeechAction } from "./actions";
// import { CopyActionSection } from "./actions/copy";
// import { PreferencesActionSection } from "./actions/preferences";
import { useHistory } from "./hooks/useHistory";

import { AnswerDetailView } from "./components/HistoryQueryDetailView";
import { IQueryHistory } from "./interface";
import { getConfigWithID, truncate } from "./util";
import { DestructiveAction } from "./components/DestructiveAction";
import Query from "./query";

export default function History() {
  const history = useHistory();
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const handleExecuteSQL = async (config: IQueryHistory) => {
    const foundConfig = await getConfigWithID(config.configID);
    console.log("config", config);
    if (foundConfig) {
      push(<Query config={foundConfig} initQueryString={config.query} />);
    }
  };

  const getActionPanel = (config: IQueryHistory) => (
    <ActionPanel>
      <ActionPanel.Section title="Output">
        <Action
          title="Execute"
          onAction={() => handleExecuteSQL(config)}
          icon={Icon.CodeBlock}
        ></Action>
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          icon={Icon.XMarkCircle}
          title="Remove"
          dialog={{
            title:
              "Are you sure you want to remove this sql from your history?",
          }}
          onAction={() => history.remove(config)}
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
      {/* <PreferencesActionSection /> */}
    </ActionPanel>
  );

  const sortedHistory = history.data.sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );

  const filteredHistory = sortedHistory
    .filter(
      (value, index, self) =>
        index === self.findIndex(history => history.id === value.id)
    )
    .filter(answer => {
      if (searchText === "") {
        return true;
      }
      return (
        answer.query.toLowerCase().includes(searchText.toLowerCase()) ||
        answer.result.toLowerCase().includes(searchText.toLowerCase())
      );
    });

  return (
    <List
      isShowingDetail={filteredHistory.length === 0 ? false : true}
      isLoading={history.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={id => {
        if (id !== selectedAnswerId) {
          setSelectedAnswerId(id);
        }
      }}
      searchBarPlaceholder="Search query..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.data.length === 0 ? (
        <List.EmptyView
          title="No history"
          description="Your sql query will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section
          title="Recent"
          subtitle={filteredHistory.length.toLocaleString()}
        >
          {filteredHistory.map(sqlResult => (
            <List.Item
              id={sqlResult.id}
              key={sqlResult.id}
              title={truncate(sqlResult.query, 24)}
              accessories={[
                {
                  text: new Date(sqlResult.createdAt ?? 0).toLocaleDateString(),
                },
              ]}
              detail={<AnswerDetailView queryHistory={sqlResult} />}
              actions={
                sqlResult && selectedAnswerId === sqlResult.id
                  ? getActionPanel(sqlResult)
                  : undefined
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
