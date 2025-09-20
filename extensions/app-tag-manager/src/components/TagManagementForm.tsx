import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { AppInfo } from "../types";
import { addTag, removeTag } from "../services/tagStorage";

interface Props {
  app: AppInfo;
  onTagsUpdate: (appName: string, newTags: string[]) => void;
}

export default function TagManagementForm({ app, onTagsUpdate }: Props) {
  const [searchText, setSearchText] = useState("");
  const [localApp, setLocalApp] = useState<AppInfo>(app);

  // Update local app state when prop changes
  useEffect(() => {
    setLocalApp(app);
  }, [app]);

  // Filter existing tags based on search
  const filteredTags = useMemo(() => {
    if (!searchText.trim()) {
      return localApp.tags;
    }
    return localApp.tags.filter((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));
  }, [localApp.tags, searchText]);

  // Check if search text is a new tag
  const isNewTag = useMemo(() => {
    const trimmedSearch = searchText.trim();
    return trimmedSearch && !localApp.tags.some((tag) => tag.toLowerCase() === trimmedSearch.toLowerCase());
  }, [searchText, localApp.tags]);

  const handleAddTag = async (tagName: string) => {
    const trimmedTag = tagName.trim();

    if (!trimmedTag) {
      showToast(Toast.Style.Failure, "Tag cannot be empty");
      return;
    }

    if (localApp.tags.some((tag) => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      showToast(Toast.Style.Failure, "Tag already exists");
      return;
    }

    try {
      const updatedTags = await addTag(localApp.name, localApp.tags, trimmedTag);
      const updatedApp = { ...localApp, tags: updatedTags };
      setLocalApp(updatedApp);
      onTagsUpdate(localApp.name, updatedTags);
      showToast(Toast.Style.Success, `Added tag "${trimmedTag}"`);
      setSearchText("");
    } catch {
      showToast(Toast.Style.Failure, "Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const updatedTags = await removeTag(localApp.name, localApp.tags, tagToRemove);
      const updatedApp = { ...localApp, tags: updatedTags };
      setLocalApp(updatedApp);
      onTagsUpdate(localApp.name, updatedTags);
      showToast(Toast.Style.Success, `Removed tag "${tagToRemove}"`);
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove tag");
    }
  };

  const getEmptyViewContent = () => {
    if (searchText.trim() && !isNewTag) {
      return {
        title: "No matching tags",
        description: `No tags match "${searchText}"`,
      };
    }

    if (localApp.tags.length === 0 && !searchText.trim()) {
      return {
        title: "No tags yet",
        description: "Type a tag name and press Enter to add it",
      };
    }

    return null;
  };

  const emptyView = getEmptyViewContent();

  return (
    <List
      navigationTitle={`Tags for ${localApp.displayName}`}
      searchBarPlaceholder="Search or add tags..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {/* Show "Add new tag" option when search text is a new tag */}
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

      {/* Show existing tags */}
      {filteredTags.length > 0 && !emptyView
        ? filteredTags.map((tag) => (
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
          ))
        : !isNewTag &&
          emptyView && <List.EmptyView title={emptyView.title} description={emptyView.description} icon={Icon.Tag} />}
    </List>
  );
}
