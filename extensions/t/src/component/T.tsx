import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useSearch } from "../hook/useSearch";
import { useHistory } from "../hook/useHistory";
import { TranslateListItem } from "./TranslateListItem";
import { Configure } from "./Configure";
import { HistoryList } from "./HistoryList";
import { FunctionComponent, useContext } from "react";
import { PreferenceContext } from "../context/PreferenceContext";
import { MessageContext } from "../context/MessageContext";

export const T: FunctionComponent = () => {
  const { source, target } = useContext(PreferenceContext);
  const { isLoading, text, setText, itemList } = useSearch(source, target);
  const { histories, onSave, onDelete } = useHistory(text);
  const { push } = useNavigation();
  const m = useContext(MessageContext);

  return (
    <List
      navigationTitle="T"
      isLoading={isLoading}
      onSearchTextChange={setText}
      searchBarPlaceholder={m((l) => l.originalText)}
      throttle
    >
      <List.Section title={text} subtitle={m((l) => l.translatedText)}>
        {itemList.map((item) => (
          <TranslateListItem key={item.key} item={item} onSave={onSave} />
        ))}
      </List.Section>
      <List.Section title={m((l) => l.savedSearchResults)} subtitle={`${m((l) => l.history)}(${histories.length})`}>
        <HistoryList items={histories} onSelect={setText} onDelete={onDelete} />
      </List.Section>
      <List.Section title={m((l) => l.history)}>
        <List.Item
          title={m((l) => l.setting)}
          accessoryIcon={Icon.Gear}
          icon={Icon.Gear}
          accessoryTitle={m((l) => l.registerApiKey)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={m((l) => l.view)}
                  onAction={() => {
                    push(<Configure />);
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};
