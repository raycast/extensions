import { Action, ActionPanel, environment, Icon, Keyboard, List, open, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getHistory, removeFromHistory } from "./lib/history-storage";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data: history, isLoading, revalidate } = usePromise(getHistory);

  const filteredHistory = history?.filter((item) => item.text.toLowerCase().includes(searchText.toLowerCase()));

  async function handleSend(text: string) {
    const url = `textream://read?text=${encodeURIComponent(text)}`;
    await open(url);
    await showHUD("Sent to Textream ✓");
  }

  async function handleDelete(id: string) {
    await removeFromHistory(id);
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search history…"
      isShowingDetail={filteredHistory && filteredHistory.length > 0}
    >
      <List.EmptyView
        title="No history found"
        description="Texts you send to Textream will appear here."
        icon={Icon.Clock}
      />
      {filteredHistory?.map((item) => (
        <List.Item
          key={item.id}
          title={item.text}
          subtitle={new Date(item.timestamp).toLocaleString()}
          detail={<List.Item.Detail markdown={item.text} />}
          actions={
            <ActionPanel>
              <Action title="Send to Textream" icon={Icon.ArrowRight} onAction={() => handleSend(item.text)} />
              <Action.CopyToClipboard content={item.text} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(item.id)}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
              <Action
                title="Open History Folder"
                icon={Icon.Folder}
                onAction={() => open(environment.supportPath)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
