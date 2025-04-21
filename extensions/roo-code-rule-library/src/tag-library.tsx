import { List, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { Tag } from "./types";
import { fetchTagsFromStorage, deleteTagFromStorage, restoreDefaultTagsInStorage } from "./tag-storage";
import { showSuccessToast, showFailureToast } from "./utils/utils";
import { TagListActions, TagItemActions } from "./action-panel-items";

export default function EditTagsForm() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTags = async () => {
    setIsLoading(true);
    try {
      const fetchedTags = await fetchTagsFromStorage();
      fetchedTags.sort((a, b) => a.name.localeCompare(b.name));
      setTags(fetchedTags);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        const result = await restoreDefaultTagsInStorage();
        setTags(result.tags);
        if (result.restored) {
          showSuccessToast("Default tags restored");
        }
      } else {
        showFailureToast("Failed to load tags.", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTags();
  }, []);

  const handleDeleteTag = async (tagToDelete: Tag) => {
    if (
      await confirmAlert({
        title: `Delete ${tagToDelete.name}?`,
        message: "You will not be able to recover it",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTagFromStorage(tagToDelete);
        showSuccessToast("Tag deleted", `Tag "${tagToDelete.name}" deleted successfully.`);
        refreshTags();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleRestoreDefaultTags = async () => {
    setIsLoading(true);
    try {
      const result = await restoreDefaultTagsInStorage();
      setTags(result.tags);
      if (result.restored) {
        showSuccessToast("Default tags restored");
      }
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tags"
      actions={
        <TagListActions
          onTagSaved={async (savedTag) => {
            if (savedTag) {
              await refreshTags();
            }
          }}
          handleRestoreDefaultTags={handleRestoreDefaultTags}
        />
      }
    >
      {tags.map((tag) => (
        <List.Item
          key={tag.name}
          title={tag.name}
          actions={
            <TagItemActions
              tag={tag}
              onTagSaved={async (savedTag) => {
                if (savedTag) {
                  await refreshTags();
                }
              }}
              handleDeleteTag={handleDeleteTag}
              handleRestoreDefaultTags={handleRestoreDefaultTags}
            />
          }
        />
      ))}
      <List.EmptyView
        title="No tags found"
        description="Add a new tag to get started."
        actions={
          <TagListActions
            onTagSaved={async (savedTag) => {
              if (savedTag) {
                await refreshTags();
              }
            }}
            handleRestoreDefaultTags={handleRestoreDefaultTags}
          />
        }
      />
    </List>
  );
}
