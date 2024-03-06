import { Action, ActionPanel, Icon, List, closeMainWindow } from "@raycast/api";
import * as iterm from "./iterm";
import { useEffect, useMemo, useState } from "react";

export default function Command() {
  const [tabs, setTabs] = useState<iterm.Tab[]>();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    (async () => {
      const titles = await iterm.getTabs();
      setTabs(titles);
    })();
  }, []);

  const filteredTabs = useMemo(() => {
    if (tabs == undefined) {
      return;
    }

    return tabs.filter((tab) => tab.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText, tabs]);

  const handleSelectItem = (index: number) => {
    if (filteredTabs == undefined) {
      return;
    }

    const tab = filteredTabs[index];
    iterm.focusTab(tab.index);
    closeMainWindow();
  };

  const handleOpenNewTab = () => {
    iterm.openNewTab();
    closeMainWindow();
  };

  return (
    <List isLoading={filteredTabs == undefined} onSearchTextChange={(text) => setSearchText(text)}>
      {filteredTabs != undefined && filteredTabs.length === 0 && (
        <List.EmptyView
          title="Not Found"
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Open New Tab" onAction={handleOpenNewTab} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      )}
      {filteredTabs?.map((tab, index) => (
        <List.Item
          key={index}
          title={tab.title}
          icon={tab.status === "idle" ? Icon.Folder : Icon.CircleProgress}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Focus to This Session" onAction={() => handleSelectItem(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
