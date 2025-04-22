import { Action, ActionPanel, Keyboard, List, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { HISTORY_KEY, RegexHistoryItem, setSelectedRegex } from "../utils/history";

export default function History() {
  const { pop } = useNavigation();
  const { value: items, setValue: setItems, isLoading } = useLocalStorage<RegexHistoryItem[]>(HISTORY_KEY, []);

  const deleteHistoryItem = (index: number) => {
    if (!items) {
      return;
    }

    if (index < 0 || index >= items.length) {
      return;
    }

    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  return (
    <List isLoading={isLoading} navigationTitle="Regex History">
      {items?.map((item, index) => (
        <List.Item
          key={`${item.pattern}-${index}`}
          title={`/${item.pattern}/${item.flags.join("")}`}
          subtitle={new Date(item.timestamp).toLocaleString()}
          actions={
            <ActionPanel>
              <Action
                title="Use This Regex"
                onAction={() => {
                  setSelectedRegex(item);
                  pop();
                }}
              />
              <Action
                title="Delete"
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteHistoryItem(index)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
