import { Action, ActionPanel, List, Icon, LocalStorage, showToast, Toast, Color, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { TabGroup } from "./manage-tab-groups";

const STORAGE_KEY = "tab-groups";

export default function OpenTabGroup() {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        setGroups(JSON.parse(stored));
      }
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load groups",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openGroup = async (group: TabGroup) => {
    try {
      for (const site of group.sites) {
        await open(site.url);
      }
      showToast({
        style: Toast.Style.Success,
        title: `Opened ${group.sites.length} tabs`,
      });
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open tabs",
      });
    }
  };

  const openAllGroups = async () => {
    try {
      const totalSites = groups.reduce((sum, g) => sum + g.sites.length, 0);

      for (const group of groups) {
        for (const site of group.sites) {
          await open(site.url);
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: `Opened ${totalSites} tabs`,
      });
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open tabs",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tab groups...">
      <List.EmptyView title="No Tab Groups" description="Create tab groups in 'Manage Tab Groups' command" />

      {groups.length > 0 && (
        <>
          <List.Item
            title="Open All Groups"
            icon={{ source: Icon.Window, tintColor: Color.Green }}
            accessories={[{ text: `${groups.reduce((sum, g) => sum + g.sites.length, 0)} tabs` }]}
            actions={
              <ActionPanel>
                <Action title="Open All Tabs" icon={Icon.Window} onAction={openAllGroups} />
              </ActionPanel>
            }
          />
          <List.Section title="Tab Groups">
            {groups.map((group) => (
              <List.Item
                key={group.id}
                title={group.name}
                icon={{ source: Icon.Folder, tintColor: Color.Blue }}
                accessories={[{ text: `${group.sites.length} sites` }]}
                actions={
                  <ActionPanel>
                    <Action title="Open Group" icon={Icon.Window} onAction={() => openGroup(group)} />
                    <ActionPanel.Section>
                      {group.sites.map((site) => (
                        <Action.OpenInBrowser key={site.id} title={`Open ${site.name}`} url={site.url} />
                      ))}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
