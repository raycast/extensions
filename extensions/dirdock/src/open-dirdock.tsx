import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { getDirectories, Directory, getTags, Tag, clearDirectories } from "./utils/storage";

type ItemAccessory = {
  text: string;
  icon: { source: Icon; tintColor: string };
};

export default function OpenDirectories() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const dirs = await getDirectories();
        const fetchedTags = await getTags();
        setDirectories(dirs);
        setTags(fetchedTags);
      } catch (error) {
        if (error instanceof Error) {
          await showToast(Toast.Style.Failure, "Failed to Load Data", error.message);
        } else {
          await showToast(Toast.Style.Failure, "Failed to Load Data", "An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleClearDirectories = async () => {
    try {
      await clearDirectories();
      setDirectories([]);
      showToast(Toast.Style.Success, "All directories cleared.");
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to Clear Directories", error.message);
      } else {
        showToast(Toast.Style.Failure, "Failed to Clear Directories", "An unknown error occurred.");
      }
    }
  };

  const filteredDirectories = directories.filter((dir) => {
    // Match directory name
    const matchesName = dir.name.toLowerCase().includes(searchText.toLowerCase());

    // Match directory tags
    const matchesTags = tags
      .filter((tag) => dir.tags.includes(tag.id)) // Get the tags associated with the directory
      .some((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase())); // Check if any tag name matches the search text

    // Match selected tags (filter by tag selection)
    const matchesSelectedTags =
      selectedTagIds.length === 0 || selectedTagIds.every((tagId) => dir.tags.includes(tagId));

    return (matchesName || matchesTags) && matchesSelectedTags;
  });

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search directories by name or tags..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Open Directories"
    >
      {/* Available Tags Section */}
      <List.Section title="Available Tags">
        {tags.map((tag) => (
          <List.Item
            key={tag.id}
            title={tag.name}
            icon={{ source: Icon.Circle, tintColor: tag.color || "#CCCCCC" }}
            accessories={[
              { text: selectedTagIds.includes(tag.id) ? "Selected" : "Not Selected" }, // Display status
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={selectedTagIds.includes(tag.id) ? "Remove Tag" : "Add Tag"}
                  onAction={() =>
                    setSelectedTagIds((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                    )
                  }
                  icon={selectedTagIds.includes(tag.id) ? Icon.Xmark : Icon.Plus}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* Directories Section */}
      {filteredDirectories.length > 0 ? (
        <List.Section title="Directories">
          {filteredDirectories.map((dir) => (
            <List.Item
              key={dir.id}
              title={dir.name}
              subtitle={dir.path}
              icon={Icon.Folder}
              accessories={dir.tags
                .map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null; // Return null if tag is not found
                  return {
                    text: tag.name,
                    icon: { source: Icon.Circle, tintColor: tag.color || "#CCCCCC" },
                  };
                })
                .filter((accessory): accessory is ItemAccessory => accessory !== null)} // Type guard to filter out null values
              actions={
                <ActionPanel>
                  <Action.Open title="Open Directory" target={dir.path} />
                  <Action.CopyToClipboard title="Copy Path" content={dir.path} />
                  <Action title="Clear All Directories" onAction={handleClearDirectories} icon={Icon.Trash} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No Directories Found"
          description="Try another search or clear filters."
          actions={
            <ActionPanel>
              <Action title="Clear Filters" onAction={() => setSelectedTagIds([])} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
