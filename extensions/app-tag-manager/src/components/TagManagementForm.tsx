import { List, ActionPanel, Action, showToast, Toast, Icon, clearSearchBar } from "@raycast/api";
import { useState, useMemo } from "react";
import { AppInfo } from "../types";
import { addTag, removeTag } from "../services/tagStorage";

interface Props {
  app: AppInfo;
  onAppUpdate: (updatedApp: AppInfo) => void;
}

export default function TagManagementForm({ app, onAppUpdate }: Props) {
  const [searchText, setSearchText] = useState("");
  const [tags, setTags] = useState<string[]>(app.tags);

  const filteredTags = useMemo(() => {
    if (!searchText.trim()) return tags;
    return tags.filter((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));
  }, [tags, searchText]);

  const isNewTag = useMemo(() => {
    const trimmedSearch = searchText.trim();
    return trimmedSearch && !tags.some((tag) => tag.toLowerCase() === trimmedSearch.toLowerCase());
  }, [searchText, tags]);

  const updateTags = (newTags: string[], successMessage: string) => {
    setTags(newTags);
    onAppUpdate({ ...app, tags: newTags });
    showToast(Toast.Style.Success, successMessage);
  };

  const handleAddTag = async (tagName: string) => {
    const trimmedTag = tagName.trim();

    if (!trimmedTag) {
      showToast(Toast.Style.Failure, "Tag cannot be empty");
      return;
    }

    if (tags.some((tag) => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      showToast(Toast.Style.Failure, "Tag already exists");
      return;
    }

    try {
      const updatedTags = await addTag(app.name, tags, trimmedTag);
      updateTags(updatedTags, `Added tag "${trimmedTag}"`);
      await clearSearchBar();
    } catch {
      showToast(Toast.Style.Failure, "Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const updatedTags = await removeTag(app.name, tags, tagToRemove);
      updateTags(updatedTags, `Removed tag "${tagToRemove}"`);
      await clearSearchBar();
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove tag");
    }
  };

  return (
    <List
      navigationTitle={`Tags for ${app.displayName}`}
      searchBarPlaceholder="Search or add tags..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {isNewTag && (
        <List.Item
          key="new-tag"
          title={`Add "${searchText.trim()}"`}
          subtitle="Press Enter to create this tag"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add Tag" onAction={() => handleAddTag(searchText)} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}

      {filteredTags.map((tag) => (
        <List.Item
          key={tag}
          title={tag}
          subtitle="Press Enter to remove"
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action
                title="Remove Tag"
                onAction={() => handleRemoveTag(tag)}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
              />
              {isNewTag && (
                <Action
                  title={`Add "${searchText.trim()}"`}
                  onAction={() => handleAddTag(searchText)}
                  icon={Icon.Plus}
                />
              )}
            </ActionPanel>
          }
        />
      ))}

      {tags.length === 0 && !searchText.trim() && (
        <List.EmptyView title="No tags yet" description="Type a tag name and press Enter to add it" icon={Icon.Tag} />
      )}
    </List>
  );
}
