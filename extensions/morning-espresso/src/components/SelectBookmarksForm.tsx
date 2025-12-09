import { Action, ActionPanel, Form, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { TabGroup } from "../manage-tab-groups";

const STORAGE_KEY = "tab-groups";

interface Bookmark {
  title: string;
  url: string;
}

interface SelectBookmarksFormProps {
  folderName: string;
  bookmarks: Bookmark[];
  mode: "create" | "add";
  /**
   * When mode === "add", this is the group we are adding into.
   * When mode === "create", this should be undefined.
   */
  targetGroupId?: string;
}

export default function SelectBookmarksForm(props: SelectBookmarksFormProps) {
  const { folderName, bookmarks, mode, targetGroupId } = props;

  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load existing tab groups from LocalStorage and initialize which bookmarks
   * are selected by default.
   */
  useEffect(() => {
    async function load() {
      try {
        const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
        const parsed: TabGroup[] = stored ? JSON.parse(stored) : [];

        // For "add" mode, avoid pre-selecting bookmarks already in the target group.
        if (mode === "add" && targetGroupId) {
          const targetGroup = parsed.find((g) => g.id === targetGroupId);
          const existingUrls = new Set(targetGroup?.sites.map((s) => s.url) ?? []);

          const initialSelected = bookmarks.filter((b) => !existingUrls.has(b.url)).map((b) => b.url);

          setSelectedUrls(initialSelected);
        } else {
          // For "create" mode, default to selecting all bookmarks.
          setSelectedUrls(bookmarks.map((b) => b.url));
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [bookmarks, mode, targetGroupId]);

  /**
   * Handle form submission: either create a new group from the selected
   * bookmarks or add the selected bookmarks into an existing group.
   */
  async function handleSubmit(values: { selectedUrls?: string[]; groupName?: string }) {
    try {
      const urlsToImport = values.selectedUrls ?? [];
      if (urlsToImport.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No bookmarks selected",
          message: "Select at least one bookmark to import.",
        });
        return;
      }

      const selectedBookmarks = bookmarks.filter((b) => urlsToImport.includes(b.url));
      if (selectedBookmarks.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No matching bookmarks",
          message: "Could not match the selected URLs to bookmarks.",
        });
        return;
      }

      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      const currentGroups: TabGroup[] = stored ? JSON.parse(stored) : [];

      let updatedGroups: TabGroup[] = [];

      if (mode === "create") {
        const groupName = (values.groupName ?? folderName).trim();
        if (!groupName) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Group name required",
            message: "Please provide a name for the new tab group.",
          });
          return;
        }

        const newGroup: TabGroup = {
          id: Date.now().toString(),
          name: groupName,
          sites: selectedBookmarks.map((b) => ({
            id: `${Date.now()}-${b.url}`,
            name: b.title,
            url: b.url,
          })),
        };

        updatedGroups = [...currentGroups, newGroup];
      } else {
        if (!targetGroupId) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No target group",
            message: "Target group is missing for adding bookmarks.",
          });
          return;
        }

        updatedGroups = currentGroups.map((group) => {
          if (group.id !== targetGroupId) {
            return group;
          }

          const existingUrls = new Set(group.sites.map((s) => s.url));

          const newSites = selectedBookmarks
            .filter((b) => !existingUrls.has(b.url)) // prevent duplicates
            .map((b) => ({
              id: `${Date.now()}-${b.url}`,
              name: b.title,
              url: b.url,
            }));

          return {
            ...group,
            sites: [...group.sites, ...newSites],
          };
        });
      }

      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGroups));

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmarks imported",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to import bookmarks",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create Tab Group" : "Add to Tab Group"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          mode === "create"
            ? `Create a new tab group from bookmarks in "${folderName}".`
            : `Add bookmarks from "${folderName}" to the selected tab group.`
        }
      />

      {mode === "create" && <Form.TextField id="groupName" title="New Group Name" placeholder={folderName} />}

      <Form.TagPicker
        id="selectedUrls"
        title="Bookmarks to Import"
        defaultValue={selectedUrls}
        onChange={setSelectedUrls}
      >
        {bookmarks.map((bookmark) => (
          <Form.TagPicker.Item key={bookmark.url} value={bookmark.url} title={bookmark.title} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
