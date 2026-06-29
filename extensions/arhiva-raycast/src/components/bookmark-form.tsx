import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import {
  createBookmark,
  listCollections,
  updateBookmark,
  type Bookmark,
  type Collection,
} from "../lib/bookmarks";
import type { Id } from "../lib/convex-api";
import { getErrorMessage } from "../lib/errors";
import { formatTags, parseTags } from "../lib/tags";
import { isHttpUrlString } from "../lib/utils";

const noCollectionValue = "__none__";

type BookmarkFormValues = Readonly<{
  url: string;
  title: string;
  description: string;
  collectionId: string;
  tags: string;
  notes: string;
  isRead: boolean;
  isFavorite: boolean;
}>;

type BookmarkFormProps = Readonly<{
  bookmark?: Bookmark;
  defaultUrl?: string;
  defaultTitle?: string;
  onSaved?: () => void;
}>;

function getInitialCollectionId(bookmark: Bookmark | undefined) {
  return bookmark?.collectionId == null ? noCollectionValue : String(bookmark.collectionId);
}

function toCollectionId(value: string) {
  return value === noCollectionValue ? null : (value as Id<"collections">);
}

export function BookmarkForm({ bookmark, defaultTitle, defaultUrl, onSaved }: BookmarkFormProps) {
  const [collections, setCollections] = useState<ReadonlyArray<Collection>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = bookmark !== undefined;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    void listCollections()
      .then((items) => {
        if (isMounted) {
          setCollections(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCollections([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(values: BookmarkFormValues) {
    const url = values.url.trim();
    if (!isHttpUrlString(url)) {
      await showToast(Toast.Style.Failure, "Enter a valid http(s) URL");
      return;
    }

    const toast = await showToast(
      Toast.Style.Animated,
      isEditing ? "Updating bookmark" : "Saving bookmark",
    );

    try {
      const input = {
        url,
        title: values.title,
        description: values.description,
        collectionId: toCollectionId(values.collectionId),
        tags: parseTags(values.tags),
        notes: values.notes,
        isRead: values.isRead,
        isFavorite: values.isFavorite,
      };

      if (bookmark === undefined) {
        const result = await createBookmark(input);
        toast.title = result.created ? "Bookmark saved" : "Bookmark updated";
      } else {
        await updateBookmark(bookmark._id, input);
        toast.title = "Bookmark updated";
      }

      toast.style = Toast.Style.Success;
      onSaved?.();
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isEditing ? "Update failed" : "Save failed";
      toast.message = getErrorMessage(error, "Unable to save bookmark.");
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Bookmark" : "Save Bookmark"}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        defaultValue={bookmark?.url ?? defaultUrl ?? ""}
        placeholder="https://example.com"
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={bookmark?.title ?? defaultTitle ?? ""}
      />
      <Form.TextField
        id="description"
        title="Description"
        defaultValue={bookmark?.description ?? ""}
      />
      <Form.Dropdown
        id="collectionId"
        title="Collection"
        defaultValue={getInitialCollectionId(bookmark)}
      >
        <Form.Dropdown.Item title="No Collection" value={noCollectionValue} />
        {collections.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            title={collection.name}
            value={String(collection.id)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="tags" title="Tags" defaultValue={formatTags(bookmark?.tags ?? [])} />
      <Form.TextArea id="notes" title="Notes" defaultValue={bookmark?.notes ?? ""} />
      <Form.Checkbox
        id="isRead"
        title="Read"
        label="Mark as read"
        defaultValue={bookmark?.isRead ?? false}
      />
      <Form.Checkbox
        id="isFavorite"
        title="Favorite"
        label="Mark as favorite"
        defaultValue={bookmark?.isFavorite ?? false}
      />
    </Form>
  );
}
