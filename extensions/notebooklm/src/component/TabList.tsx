import { useState, useEffect } from "react";
import { Action, ActionPanel, Color, Icon, Image, List, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { NotebookService } from "../services";
import { Notebook, TabInfo, TabList } from "../types";
import { formatNavigationTitle } from "../utils/transformData";

export function ArcTabList(props: { notebookService: NotebookService; notebook: Notebook | null }) {
  const { notebookService, notebook } = props;
  const [selectedTabs, setSelectedTabs] = useState<TabInfo[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [tabList, setTabList] = useState<TabList | null>(notebookService.tabList);
  const { pop } = useNavigation();

  const toggleTabSelection = (tab: TabInfo) => {
    setSelectedTabs((prev) => {
      const isSelected = prev.some((t) => t.id === tab.id);
      if (isSelected) {
        return prev.filter((t) => t.id !== tab.id);
      } else {
        return [...prev, tab];
      }
    });
  };

  useEffect(() => {
    notebookService.getTabList();
  }, [notebookService]);

  useEffect(() => {
    const unsubLoading = notebookService.subscribe("loading", (data) => {
      if (data && "scope" in data && data.scope === "tabList" && "status" in data) {
        setLoading(data.status);
      }
    });

    const unsubTabList = notebookService.subscribe("tabListUpdated", (data) => {
      if (data && "tabList" in data) {
        setTabList(data.tabList as TabList);
      }
    });

    return () => {
      unsubLoading();
      unsubTabList();
    };
  }, [notebookService]);

  const allTabs = tabList ? [...(tabList.currentTab ? [tabList.currentTab] : []), ...tabList.others] : [];

  const PrimaryAction = () => (
    <Action
      title="Add Selected Tabs"
      icon={Icon.Plus}
      onAction={async () => {
        if (selectedTabs.length > 0) {
          pop();
          await notebookService.addTabs(selectedTabs, notebook?.id);
        }
      }}
    />
  );

  const SelectAllAction = () => (
    <Action
      title={selectedTabs.length !== allTabs.length ? "Select All" : "Deselect All"}
      icon={Icon.Checkmark}
      onAction={() => {
        if (selectedTabs.length === allTabs.length) {
          setSelectedTabs([]);
        } else {
          setSelectedTabs(allTabs);
        }
      }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Add Tabs in ${formatNavigationTitle(notebook)}`}>
      {tabList ? (
        <>
          {tabList.currentTab && (
            <List.Section title="Current Tab">
              <List.Item
                key={tabList.currentTab.id}
                icon={
                  selectedTabs.some((t) => t.id === tabList.currentTab!.id)
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : getFavicon(tabList.currentTab.url, { mask: Image.Mask.RoundedRectangle })
                }
                title={tabList.currentTab.title}
                actions={
                  <ActionPanel>
                    <Action
                      title={selectedTabs.some((t) => t.id === tabList.currentTab!.id) ? "Deselect Tab" : "Select Tab"}
                      icon={Icon.Checkmark}
                      onAction={() => toggleTabSelection(tabList.currentTab!)}
                    />
                    <PrimaryAction />
                    <SelectAllAction />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Other Tabs">
            {tabList.others.map((tab) => (
              <List.Item
                key={tab.id}
                icon={
                  selectedTabs.some((t) => t.id === tab.id)
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : getFavicon(tab.url, { mask: Image.Mask.RoundedRectangle })
                }
                title={tab.title}
                actions={
                  <ActionPanel>
                    <Action
                      title={selectedTabs.some((t) => t.id === tab.id) ? "Deselect Tab" : "Select Tab"}
                      icon={Icon.Checkmark}
                      onAction={() => toggleTabSelection(tab)}
                    />
                    <PrimaryAction />
                    <SelectAllAction />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

export function OthersTabList(props: { notebookService: NotebookService; notebook: Notebook | null }) {
  const { notebookService, notebook } = props;
  const [selectedTabs, setSelectedTabs] = useState<TabInfo[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [tabList, setTabList] = useState<TabList | null>(notebookService.tabList);
  const { pop } = useNavigation();

  const toggleTabSelection = (tab: TabInfo) => {
    setSelectedTabs((prev) => {
      const isSelected = prev.some((t) => t.id === tab.id);
      if (isSelected) {
        return prev.filter((t) => t.id !== tab.id);
      } else {
        return [...prev, tab];
      }
    });
  };

  useEffect(() => {
    notebookService.getTabList();
  }, [notebookService]);

  useEffect(() => {
    const unsubLoading = notebookService.subscribe("loading", (data) => {
      if (data && "scope" in data && data.scope === "tabList" && "status" in data) {
        setLoading(data.status);
      }
    });

    const unsubTabList = notebookService.subscribe("tabListUpdated", (data) => {
      if (data && "tabList" in data) {
        setTabList(data.tabList as TabList);
      }
    });

    return () => {
      unsubLoading();
      unsubTabList();
    };
  }, [notebookService]);

  const allTabs = tabList ? [...(tabList.currentTab ? [tabList.currentTab] : []), ...tabList.others] : [];

  const PrimaryAction = () => (
    <Action
      title="Add Selected Tabs"
      icon={Icon.Plus}
      onAction={async () => {
        if (selectedTabs.length > 0) {
          pop();
          await notebookService.addTabs(selectedTabs, notebook?.id);
        }
      }}
    />
  );

  const SelectAllAction = () => (
    <Action
      title={selectedTabs.length !== allTabs.length ? "Select All" : "Deselect All"}
      icon={Icon.Checkmark}
      onAction={() => {
        if (selectedTabs.length === allTabs.length) {
          setSelectedTabs([]);
        } else {
          setSelectedTabs(allTabs);
        }
      }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Add Tabs in ${formatNavigationTitle(notebook)}`}>
      {tabList ? (
        <>
          {tabList.currentTab && (
            <List.Section title="Current Tab">
              <List.Item
                key={tabList.currentTab!.id}
                icon={
                  selectedTabs.some((t) => t.id === tabList.currentTab!.id)
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : getFavicon(tabList.currentTab.url, { mask: Image.Mask.RoundedRectangle })
                }
                title={tabList.currentTab.title}
                actions={
                  <ActionPanel>
                    <Action
                      title={selectedTabs.some((t) => t.id === tabList.currentTab!.id) ? "Deselect Tab" : "Select Tab"}
                      icon={Icon.Checkmark}
                      onAction={() => toggleTabSelection(tabList.currentTab!)}
                    />
                    <PrimaryAction />
                    <SelectAllAction />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Other Tabs">
            {tabList.others.map((tab) => (
              <List.Item
                key={tab.id}
                icon={
                  selectedTabs.some((t) => t.id === tab.id)
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : getFavicon(tab.url, { mask: Image.Mask.RoundedRectangle })
                }
                title={tab.title}
                actions={
                  <ActionPanel>
                    <Action
                      title={selectedTabs.some((t) => t.id === tab.id) ? "Deselect Tab" : "Select Tab"}
                      icon={Icon.Checkmark}
                      onAction={() => toggleTabSelection(tab)}
                    />
                    <PrimaryAction />
                    <SelectAllAction />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
