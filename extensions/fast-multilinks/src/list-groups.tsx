import { ActionPanel, Action, List, showToast, Toast, closeMainWindow, Form, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface LinkGroup {
  id: string;
  name: string;
  urls: string[];
  browser?: string;
}

export default function ListGroups() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [newlyCreatedGroup, setNewlyCreatedGroup] = useState<LinkGroup | null>(null);

  useEffect(() => {
    async function loadGroups() {
      const stored = await LocalStorage.getItem<string>("link-groups");
      if (stored) {
        try {
          setGroups(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse groups:", e);
        }
      }
    }
    loadGroups();
  }, []);

  const openURL = async (url: string, browserName?: string) => {
    if (browserName) {
      await execAsync(`open -a "${browserName}" "${url}"`);
    } else {
      await execAsync(`open "${url}"`);
    }
  };

  const handleOpenAll = async (group: LinkGroup) => {
    for (const url of group.urls) {
      await openURL(url, group.browser);
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Opened all URLs",
      message: `Browser: ${group.browser || "default"}`,
    });
    await closeMainWindow();
  };

  const handleDelete = async (id: string) => {
    const updatedGroups = groups.filter((g) => g.id !== id);
    await LocalStorage.setItem("link-groups", JSON.stringify(updatedGroups));
    setGroups(updatedGroups);
    showToast({
      style: Toast.Style.Success,
      title: "Group deleted",
    });
  };

  const handleAddGroup = async (values: { name: string; urls: string; browser: string }) => {
    const urls = values.urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u);
    const newGroup: LinkGroup = {
      id: Date.now().toString(),
      name: values.name,
      urls,
      browser: values.browser || undefined,
    };
    const updatedGroups = [...groups, newGroup];
    await LocalStorage.setItem("link-groups", JSON.stringify(updatedGroups));
    setGroups(updatedGroups);
    setShowAddForm(false);
    setNewlyCreatedGroup(newGroup);
    showToast({
      style: Toast.Style.Success,
      title: "Group added",
    });
  };

  const handleEditGroup = async (values: { name: string; urls: string; browser: string }) => {
    if (!editingGroup) return;
    const urls = values.urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u);
    const updatedGroups = groups.map((g) =>
      g.id === editingGroup.id ? { ...g, name: values.name, urls, browser: values.browser || undefined } : g,
    );
    await LocalStorage.setItem("link-groups", JSON.stringify(updatedGroups));
    setGroups(updatedGroups);
    setEditingGroup(null);
    showToast({
      style: Toast.Style.Success,
      title: "Group updated",
    });
  };

  if (newlyCreatedGroup) {
    const deeplink = `raycast://extensions/Chucktaylor/fast-multilinks/open-group?arguments=${encodeURIComponent(JSON.stringify({ groupName: newlyCreatedGroup.name }))}`;
    return (
      <List>
        <List.Item
          title={`"${newlyCreatedGroup.name}" created!`}
          subtitle="Press Enter to add to root search as a Quicklink"
          actions={
            <ActionPanel>
              <Action.CreateQuicklink
                title="Add to Root Search"
                quicklink={{ link: deeplink, name: newlyCreatedGroup.name }}
              />
              <Action title="Skip" onAction={() => setNewlyCreatedGroup(null)} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (showAddForm) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Group" onSubmit={handleAddGroup} />
            <Action title="Cancel" onAction={() => setShowAddForm(false)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Group Name" placeholder="My Links" />
        <Form.TextArea
          id="urls"
          title="URLs (one per line)"
          placeholder="https://example.com&#10;https://google.com"
        />
        <Form.Dropdown id="browser" title="Browser" defaultValue="">
          <Form.Dropdown.Item value="" title="System Default" />
          <Form.Dropdown.Item value="Arc" title="Arc" />
          <Form.Dropdown.Item value="Safari" title="Safari" />
          <Form.Dropdown.Item value="Google Chrome" title="Google Chrome" />
          <Form.Dropdown.Item value="Firefox" title="Firefox" />
          <Form.Dropdown.Item value="Microsoft Edge" title="Microsoft Edge" />
          <Form.Dropdown.Item value="Brave Browser" title="Brave" />
        </Form.Dropdown>
      </Form>
    );
  }

  if (editingGroup) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Changes" onSubmit={handleEditGroup} />
            <Action title="Cancel" onAction={() => setEditingGroup(null)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Group Name" defaultValue={editingGroup.name} placeholder="My Links" />
        <Form.TextArea
          id="urls"
          title="URLs (one per line)"
          defaultValue={editingGroup.urls.join("\n")}
          placeholder="https://example.com&#10;https://google.com"
        />
        <Form.Dropdown id="browser" title="Browser" defaultValue={editingGroup.browser || ""}>
          <Form.Dropdown.Item value="" title="System Default" />
          <Form.Dropdown.Item value="Arc" title="Arc" />
          <Form.Dropdown.Item value="Safari" title="Safari" />
          <Form.Dropdown.Item value="Google Chrome" title="Google Chrome" />
          <Form.Dropdown.Item value="Firefox" title="Firefox" />
          <Form.Dropdown.Item value="Microsoft Edge" title="Microsoft Edge" />
          <Form.Dropdown.Item value="Brave Browser" title="Brave" />
        </Form.Dropdown>
      </Form>
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Add New Group" onAction={() => setShowAddForm(true)} />
        </ActionPanel>
      }
      searchBarPlaceholder="Search groups..."
    >
      {groups.length === 0 && <List.EmptyView title="No Groups Yet" description="Create a group to get started" />}
      {groups.map((group) => (
        <List.Item
          key={group.id}
          title={group.name}
          subtitle={`${group.urls.length} URL${group.urls.length !== 1 ? "s" : ""}`}
          accessories={[
            { tag: group.browser || "Default" },
            { text: group.urls.slice(0, 2).join(", ") + (group.urls.length > 2 ? "..." : "") },
          ]}
          actions={
            <ActionPanel>
              <Action title="Open All" onAction={() => handleOpenAll(group)} />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  link: `raycast://extensions/Chucktaylor/fast-multilinks/open-group?arguments=${encodeURIComponent(JSON.stringify({ groupName: group.name }))}`,
                  name: group.name,
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
              <Action.CopyToClipboard
                title="Copy Deeplink"
                content={`raycast://extensions/Chucktaylor/fast-multilinks/open-group?arguments=${encodeURIComponent(JSON.stringify({ groupName: group.name }))}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action title="Edit" onAction={() => setEditingGroup(group)} />
              <Action title="Delete" style={Action.Style.Destructive} onAction={() => handleDelete(group.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
