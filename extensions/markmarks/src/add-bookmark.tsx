import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  popToRoot,
  showHUD,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { parseBookmarks, getGroupNames } from "./lib/bookmarks-parser";
import { readBookmarksFile, addBookmark, createGroup } from "./lib/bookmarks-writer";
import { getActiveTabFromFrontmostBrowser } from "./lib/browser";

export default function AddBookmark() {
  const { bookmarksFile } = getPreferenceValues<Preferences>();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [groups, setGroups] = useState<Array<{ name: string; path: string; level: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const content = readBookmarksFile(bookmarksFile);
        const parsed = parseBookmarks(content);
        const allGroups = getGroupNames(parsed.groups);
        setGroups(allGroups);

        const result = await getActiveTabFromFrontmostBrowser();

        if (result) {
          setTitle(result.tab.title);
          setUrl(result.tab.url);
          showToast({
            style: Toast.Style.Success,
            title: `Got tab from ${result.browser}`,
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [bookmarksFile]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    if (!url.trim()) {
      showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    // Validate URL
    try {
      new URL(url.trim());
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      return;
    }

    const isCreatingNewGroup = selectedGroup === "__new__";
    const targetGroup = isCreatingNewGroup ? newGroupName.trim() : selectedGroup;

    if (isCreatingNewGroup && !newGroupName.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Group name is required" });
      return;
    }

    try {
      if (isCreatingNewGroup) {
        createGroup(bookmarksFile, targetGroup);
      }

      addBookmark(bookmarksFile, targetGroup, title.trim(), url.trim(), description.trim() || undefined);

      await showHUD(targetGroup ? `Bookmark saved to ${targetGroup}` : "Bookmark saved");
      await popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save bookmark",
        message: String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" icon={Icon.Bookmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} placeholder="Bookmark title" />

      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} placeholder="https://example.com" />

      <Form.TextField
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
        placeholder="Optional description"
      />

      <Form.Separator />

      <Form.Dropdown id="group" title="Group" value={selectedGroup} onChange={setSelectedGroup}>
        <Form.Dropdown.Item key="__none__" value="" title="No group" />
        {groups.map((group) => (
          <Form.Dropdown.Item key={group.path} value={group.name} title={group.path} />
        ))}
        <Form.Dropdown.Section title="Create">
          <Form.Dropdown.Item key="__new__" value="__new__" title="New group..." icon={Icon.Plus} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {selectedGroup === "__new__" && (
        <Form.TextField
          id="newGroup"
          title="Group Name"
          value={newGroupName}
          onChange={setNewGroupName}
          placeholder="Enter group name"
        />
      )}
    </Form>
  );
}
