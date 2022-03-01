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
      searchBarPlaceholder={m((l) => l.OriginalText)}
      throttle
    >
      <List.Section title={text} subtitle={m((l) => l.TranslatedText)}>
        {itemList.map((item) => (
          <TranslateListItem key={item.key} item={item} onSave={onSave} />
        ))}
      </List.Section>
      <List.Section title={m((l) => l.SavedSearchResults)} subtitle={`${m((l) => l.History)}(${histories.length})`}>
        <HistoryList items={histories} onSelect={setText} onDelete={onDelete} />
      </List.Section>
      <List.Section title={m((l) => l.History)}>
        <List.Item
          title={m((l) => l.Setting)}
          accessoryIcon={Icon.Gear}
          icon={Icon.Gear}
          accessoryTitle={m((l) => l.RegisterApiKey)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={m((l) => l.View)}
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
