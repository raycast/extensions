import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Bookmark } from "../types";
import { useStorage } from "../hooks/useStorage";
import { fetchPageMetadata } from "../utils/fetch-title";
import { TagInput } from "./tag-input";

interface EditBookmarkProps {
  bookmark: Bookmark;
  onEdit?: () => void;
}

export function EditBookmark({ bookmark, onEdit }: EditBookmarkProps) {
  const { data, updateBookmark, isLoading, getTagsForBookmark } = useStorage();
  const { pop } = useNavigation();
  const [url, setUrl] = useState(bookmark.url);
  const [title, setTitle] = useState(bookmark.title);
  const [description, setDescription] = useState(bookmark.description || "");
  const [tags, setTags] = useState<string[]>([]);

  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const [tagsInitialized, setTagsInitialized] = useState(false);

  // Initialize tags once after data is loaded
  useEffect(() => {
    if (!isLoading && data.tags.length >= 0) {
      const bookmarkTags = getTagsForBookmark(bookmark);
      const tagNames = bookmarkTags.map((tag) => tag.name);
      setTags(tagNames);
      setTagsInitialized(true);
    }
  }, [isLoading, tagsInitialized]);

  async function handleSubmit() {
    if (!url || !title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "URL and title are required",
      });
      return;
    }

    try {
      // Convert tag names to tag IDs
      const tagIds = tags
        .map((tagName) => data.tags.find((t) => t.name === tagName)?.id)
        .filter((id): id is string => id !== undefined);

      await updateBookmark(bookmark.id, {
        url,
        title,
        description: description || undefined,
        tagIds,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark updated!",
      });

      onEdit?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update bookmark",
        message: String(error),
      });
    }
  }

  async function handleRefetchTitle() {
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter URL first",
      });
      return;
    }

    setIsFetchingTitle(true);
    const metadata = await fetchPageMetadata(url);
    setIsFetchingTitle(false);

    if (metadata?.title) {
      setTitle(metadata.title);
      if (metadata.description) {
        setDescription(metadata.description);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Title updated!",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not fetch title",
      });
    }
  }

  if (isLoading || !tagsInitialized) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isFetchingTitle}
      navigationTitle="Edit Bookmark"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Bookmark" onSubmit={handleSubmit} />
          <Action
            title="Refresh Title"
            icon={Icon.ArrowClockwise}
            onAction={handleRefetchTitle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com" value={url} onChange={setUrl} />
      <Form.TextField
        id="title"
        title="Title"
        placeholder={isFetchingTitle ? "Fetching title..." : "Bookmark title"}
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />

      <TagInput
        key={`tags-${bookmark.id}`}
        id="tags"
        title="Tags"
        value={tags}
        onChange={setTags}
        availableTags={data.tags}
      />
    </Form>
  );
}
