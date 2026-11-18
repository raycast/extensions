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

  const handleAddTag = async (tagName: string) => {
    const startTime = Date.now();
    console.log(`[PERF] Starting handleAddTag for "${tagName}"...`);

    const trimmedTag = tagName.trim();

    if (!trimmedTag) {
      showToast(Toast.Style.Failure, "Tag cannot be empty");
      return;
    }

    if (tags.some((tag) => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      showToast(Toast.Style.Failure, "Tag already exists");
      return;
    }

    // Optimistic update - update UI immediately
    const optimisticStart = Date.now();
    const optimisticTags = [...new Set([...tags, trimmedTag])];
    setTags(optimisticTags);
    onAppUpdate({ ...app, tags: optimisticTags });
    const optimisticTime = Date.now() - optimisticStart;
    console.log(`[PERF] Optimistic update completed in ${optimisticTime}ms`);

    showToast(Toast.Style.Success, `Added tag "${trimmedTag}"`);
    await clearSearchBar();

    // Save to storage in the background
    try {
      const storageStart = Date.now();
      await addTag(app.name, tags, trimmedTag);
      const storageTime = Date.now() - storageStart;
      console.log(`[PERF] Background storage completed in ${storageTime}ms`);
    } catch {
      // Revert optimistic update on failure
      setTags(tags);
      onAppUpdate({ ...app, tags });
      showToast(Toast.Style.Failure, "Failed to save tag");
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PERF] handleAddTag completed in ${totalTime}ms`);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const startTime = Date.now();
    console.log(`[PERF] Starting handleRemoveTag for "${tagToRemove}"...`);

    // Optimistic update - update UI immediately
    const optimisticStart = Date.now();
    const optimisticTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(optimisticTags);
    onAppUpdate({ ...app, tags: optimisticTags });
    const optimisticTime = Date.now() - optimisticStart;
    console.log(`[PERF] Optimistic update completed in ${optimisticTime}ms`);

    showToast(Toast.Style.Success, `Removed tag "${tagToRemove}"`);
    await clearSearchBar();

    // Save to storage in the background
    try {
      const storageStart = Date.now();
      await removeTag(app.name, tags, tagToRemove);
      const storageTime = Date.now() - storageStart;
      console.log(`[PERF] Background storage completed in ${storageTime}ms`);
    } catch {
      // Revert optimistic update on failure
      setTags(tags);
      onAppUpdate({ ...app, tags });
      showToast(Toast.Style.Failure, "Failed to remove tag");
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PERF] handleRemoveTag completed in ${totalTime}ms`);
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
