import { Action, ActionPanel, Clipboard, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
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

  const pinHistoryItem = (index: number) => {
    if (items === undefined) {
      console.error("Pin History called before component is mounted");
      return;
    }

    if (index < 0 || index >= items.length) {
      console.error("Pin History called with invalid index");
      return;
    }

    const newItems = [...items];
    newItems[index].isPinned = true;
    setItems(newItems);
  };

  const unpinHistoryItem = (index: number) => {
    if (items === undefined) {
      console.error("Unpin History called before component is mounted");
      return;
    }

    if (index < 0 || index >= items.length) {
      console.error("Unpin History called with invalid index");
      return;
    }

    const newItems = [...items];
    newItems[index].isPinned = false;
    setItems(newItems);
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Regex History"
      actions={
        <Action title="Clear History" shortcut={Keyboard.Shortcut.Common.RemoveAll} onAction={() => setItems([])} />
      }
    >
      {items?.length === 0 ? (
        <List.EmptyView title="No history items" description="Start testing regex patterns to populate your history" />
      ) : null}

      <List.Section title="Pinned">
        {items?.map((item, index) =>
          item.isPinned ? (
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
                    title="Copy to Clipboard"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={() => {
                      Clipboard.copy(`/${item.pattern}/${item.flags.join("")}`);
                      showToast({
                        title: "Copied to Clipboard",
                        style: Toast.Style.Success,
                      });
                    }}
                  />
                  <Action
                    title="Unpin"
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() => unpinHistoryItem(index)}
                  />
                </ActionPanel>
              }
            />
          ) : null
        )}
      </List.Section>

      <List.Section title="History">
        {items?.map((item, index) =>
          !item.isPinned ? (
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
                    onAction={() => {
                      deleteHistoryItem(index);
                      showToast({
                        title: "Deleted from History",
                        style: Toast.Style.Success,
                      });
                    }}
                  />
                  <Action
                    title="Copy to Clipboard"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={() => {
                      Clipboard.copy(`/${item.pattern}/${item.flags.join("")}`);
                      showToast({
                        title: "Copied to Clipboard",
                        style: Toast.Style.Success,
                      });
                    }}
                  />
                  <Action title="Pin" shortcut={Keyboard.Shortcut.Common.Pin} onAction={() => pinHistoryItem(index)} />
                </ActionPanel>
              }
            />
          ) : null
        )}
      </List.Section>
    </List>
  );
}
