import { Action, ActionPanel, List } from "@raycast/api";
import EmberApiStore from "./services/ember-api-store";

export default function Command() {
  const store = new EmberApiStore();
  const emberDocumentation = store.getEmberDocumentation();
  const emberDataDocumentation = store.getEmberDataDocumentation();
  const searchText = "Search in Ember.js Documentation";
  return (
    <List searchBarPlaceholder={searchText}>
      <List.Section title="Ember">
        {emberDocumentation.map((item, index) => (
          <List.Item
            title={item.name}
            key={index}
            accessories={[{ text: item.type }, { text: item.version }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Ember Data">
        {emberDataDocumentation.map((item, index) => (
          <List.Item
            title={item.name}
            key={index}
            accessories={[{ text: item.type }, { text: item.version }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
