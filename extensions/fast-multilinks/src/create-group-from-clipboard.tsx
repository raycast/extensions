import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Form,
  Clipboard,
  LocalStorage,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface LinkGroup {
  id: string;
  name: string;
  urls: string[];
  browser?: string;
}

interface ClipboardURL {
  url: string;
  selected: boolean;
}

export default function CreateGroupFromClipboard() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [clipboardURLs, setClipboardURLs] = useState<ClipboardURL[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [browser, setBrowser] = useState("");
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

  useEffect(() => {
    async function fetchClipboardHistory() {
      try {
        const urls: ClipboardURL[] = [];
        for (let i = 0; i < 5; i++) {
          const text = await Clipboard.readText({ offset: i });
          if (text && text.startsWith("http")) {
            urls.push({ url: text, selected: true });
          }
        }
        setClipboardURLs(urls);
        setLoading(false);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
          message: String(error),
        });
        setLoading(false);
      }
    }
    fetchClipboardHistory();
  }, []);

  const toggleURLSelection = (index: number) => {
    setClipboardURLs(
      clipboardURLs.map((item: ClipboardURL, i: number) =>
        i === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleSaveGroup = async () => {
    try {
      const selectedURLs = clipboardURLs.filter((u: ClipboardURL) => u.selected).map((u: ClipboardURL) => u.url);
      if (selectedURLs.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No URLs selected",
        });
        return;
      }
      if (!groupName.trim()) {
        setEditingName(true);
        return;
      }
      const newGroup: LinkGroup = {
        id: Date.now().toString(),
        name: groupName,
        urls: selectedURLs,
        browser: browser || undefined,
      };
      const updatedGroups = [...groups, newGroup];
      await LocalStorage.setItem("link-groups", JSON.stringify(updatedGroups));
      setGroups(updatedGroups);
      setNewlyCreatedGroup(newGroup);
      await showToast({
        style: Toast.Style.Success,
        title: "Group saved",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save group",
        message: String(error),
      });
    }
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
              <Action
                title="Skip"
                onAction={async () => {
                  setNewlyCreatedGroup(null);
                  await closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (editingName) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save Group"
              onSubmit={async (values: { name: string; browser: string }) => {
                if (!values.name.trim()) {
                  showToast({ style: Toast.Style.Failure, title: "Please enter a group name" });
                  return;
                }
                setGroupName(values.name);
                setBrowser(values.browser);
                const selectedURLs = clipboardURLs.filter((u) => u.selected).map((u) => u.url);
                if (selectedURLs.length === 0) {
                  showToast({ style: Toast.Style.Failure, title: "No URLs selected" });
                  return;
                }
                const newGroup: LinkGroup = {
                  id: Date.now().toString(),
                  name: values.name,
                  urls: selectedURLs,
                  browser: values.browser || undefined,
                };
                const updatedGroups = [...groups, newGroup];
                await LocalStorage.setItem("link-groups", JSON.stringify(updatedGroups));
                setGroups(updatedGroups);
                setNewlyCreatedGroup(newGroup);
                await showToast({ style: Toast.Style.Success, title: "Group saved" });
              }}
            />
            <Action title="Cancel" onAction={() => setEditingName(false)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Group Name" placeholder="My Links" />
        <Form.Dropdown id="browser" title="Browser" defaultValue={browser}>
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

  if (loading) {
    return (
      <List>
        <List.EmptyView title="Loading clipboard history..." />
      </List>
    );
  }

  if (clipboardURLs.length === 0) {
    return (
      <List>
        <List.EmptyView title="No URLs found" description="Copy some URLs to your clipboard first" />
      </List>
    );
  }

  const sectionTitle = "Clipboard URLs (" + clipboardURLs.length + ")";

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Save Group" onAction={handleSaveGroup} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
      searchBarPlaceholder="Enter group name above"
    >
      <List.Section title="Group Name">
        <List.Item
          title={groupName || "Enter group name..."}
          actions={
            <ActionPanel>
              <Action
                title="Edit Group Name"
                onAction={() => setEditingName(true)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action title="Save Group" onAction={handleSaveGroup} shortcut={{ modifiers: ["cmd"], key: "s" }} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={sectionTitle}>
        {clipboardURLs.map((item: ClipboardURL, index: number) => (
          <List.Item
            key={index}
            title={item.url}
            accessories={[{ tag: item.selected ? "Selected" : "Unselected" }]}
            actions={
              <ActionPanel>
                <Action
                  title={item.selected ? "Deselect" : "Select"}
                  onAction={() => toggleURLSelection(index)}
                  shortcut={{ modifiers: [], key: "space" }}
                />
                <Action title="Save Group" onAction={handleSaveGroup} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
