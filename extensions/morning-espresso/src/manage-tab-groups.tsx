import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CreateGroupForm from "./components/CreateGroupForm";
import EditGroupForm from "./components/EditGroupForm";
import AddSiteForm from "./components/AddSiteForm";

export interface Site {
  id: string;
  name: string;
  url: string;
}

export interface TabGroup {
  id: string;
  name: string;
  sites: Site[];
}

const STORAGE_KEY = "tab-groups";

export default function ManageTabGroups() {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load groups from storage
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

  const saveGroups = async (newGroups: TabGroup[]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
      setGroups(newGroups);
      showToast({
        style: Toast.Style.Success,
        title: "Saved successfully",
      });
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
      });
    }
  };

  const addGroup = (name: string) => {
    const newGroup: TabGroup = {
      id: Date.now().toString(),
      name,
      sites: [],
    };
    saveGroups([...groups, newGroup]);
  };

  const deleteGroup = async (groupId: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Group",
      message: "Are you sure you want to delete this group?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      saveGroups(groups.filter((g) => g.id !== groupId));
    }
  };

  const editGroup = (groupId: string, newName: string) => {
    saveGroups(groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g)));
  };

  const addSite = (groupId: string, name: string, url: string) => {
    const newSite: Site = {
      id: Date.now().toString(),
      name,
      url,
    };

    saveGroups(groups.map((g) => (g.id === groupId ? { ...g, sites: [...g.sites, newSite] } : g)));
  };

  const deleteSite = async (groupId: string, siteId: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Site",
      message: "Are you sure you want to delete this site?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      saveGroups(groups.map((g) => (g.id === groupId ? { ...g, sites: g.sites.filter((s) => s.id !== siteId) } : g)));
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

  const moveGroupUp = (index: number) => {
    if (index === 0) return;
    const newGroups = [...groups];
    [newGroups[index - 1], newGroups[index]] = [newGroups[index], newGroups[index - 1]];
    saveGroups(newGroups);
  };

  const moveGroupDown = (index: number) => {
    if (index === groups.length - 1) return;
    const newGroups = [...groups];
    [newGroups[index], newGroups[index + 1]] = [newGroups[index + 1], newGroups[index]];
    saveGroups(newGroups);
  };

  const moveSiteUp = (groupId: string, siteIndex: number) => {
    if (siteIndex === 0) return;

    saveGroups(
      groups.map((g) => {
        if (g.id === groupId) {
          const newSites = [...g.sites];
          [newSites[siteIndex - 1], newSites[siteIndex]] = [newSites[siteIndex], newSites[siteIndex - 1]];
          return { ...g, sites: newSites };
        }
        return g;
      }),
    );
  };

  const moveSiteDown = (groupId: string, siteIndex: number, totalSites: number) => {
    if (siteIndex === totalSites - 1) return;

    saveGroups(
      groups.map((g) => {
        if (g.id === groupId) {
          const newSites = [...g.sites];
          [newSites[siteIndex], newSites[siteIndex + 1]] = [newSites[siteIndex + 1], newSites[siteIndex]];
          return { ...g, sites: newSites };
        }
        return g;
      }),
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search groups and sites...">
      <List.EmptyView
        title="No Tab Groups"
        description="Create your first tab group to get started"
        actions={
          <ActionPanel>
            <Action.Push title="Create Group" icon={Icon.Plus} target={<CreateGroupForm onCreate={addGroup} />} />
          </ActionPanel>
        }
      />

      {groups.map((group, groupIndex) => (
        <List.Section key={group.id} title={group.name} subtitle={`${group.sites.length} sites`}>
          {group.sites.map((site, siteIndex) => (
            <List.Item
              key={site.id}
              title={site.name}
              subtitle={site.url}
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              accessories={[{ text: `#${siteIndex + 1}` }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={site.url} />
                  <Action
                    title="Open Group"
                    icon={Icon.Window}
                    onAction={() => openGroup(group)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Site to Group"
                      icon={Icon.Plus}
                      target={<AddSiteForm groupId={group.id} onAdd={addSite} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Delete Site"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteSite(group.id, site.id)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Reorder">
                    <Action
                      title="Move Site up"
                      icon={Icon.ArrowUp}
                      onAction={() => moveSiteUp(group.id, siteIndex)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                    <Action
                      title="Move Site Down"
                      icon={Icon.ArrowDown}
                      onAction={() => moveSiteDown(group.id, siteIndex, group.sites.length)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Group"
                      icon={Icon.Pencil}
                      target={<EditGroupForm group={group} onEdit={editGroup} />}
                    />
                    <Action
                      title="Delete Group"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteGroup(group.id)}
                    />
                    <Action title="Move Group up" icon={Icon.ArrowUp} onAction={() => moveGroupUp(groupIndex)} />
                    <Action title="Move Group Down" icon={Icon.ArrowDown} onAction={() => moveGroupDown(groupIndex)} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}

          {group.sites.length === 0 && (
            <List.Item
              title="No sites in this group"
              icon={Icon.MinusCircle}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Add Site"
                    icon={Icon.Plus}
                    target={<AddSiteForm groupId={group.id} onAdd={addSite} />}
                  />
                  <Action
                    title="Delete Group"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteGroup(group.id)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ))}

      {groups.length > 0 && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Group"
            icon={{ source: Icon.Plus, tintColor: Color.Purple }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Group"
                  icon={Icon.Plus}
                  target={<CreateGroupForm onCreate={addGroup} />}
                />
              </ActionPanel>
            }
          />
          {groups.length > 0 && (
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
          )}
        </List.Section>
      )}
    </List>
  );
}
