import { Action, ActionPanel, Form, openExtensionPreferences, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { KeeplyApi } from "./lib/api.js";
import type { Folder, Tag } from "./lib/types.js";
import { isValidUrl, NO_FOLDER, resolveOrCreateTag, showApiError, toError } from "./lib/utils.js";

const api = new KeeplyApi();

interface FormValues {
  url: string;
  title: string;
  description: string;
  note: string;
  folderId: string;
  tagIds: string[];
  newTagName: string;
}

export default function AddBookmark() {
  const { pop } = useNavigation();

  const { data: sidebar, isLoading } = useCachedPromise(() => api.getSidebarData(), [], {
    onError: (error) => showApiError(error),
  });

  async function handleSubmit(values: FormValues) {
    if (!isValidUrl(values.url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Must start with http:// or https://",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving bookmark..." });

    try {
      const extraTagId = await resolveOrCreateTag(values.newTagName, sidebar, (name: string) => api.createTag(name));

      const tagIds = extraTagId ? [...values.tagIds, extraTagId] : values.tagIds;

      const bookmark = await api.createBookmark({
        url: values.url,
        title: values.title || undefined,
        description: values.description || undefined,
        note: values.note || undefined,
        folderId: values.folderId === NO_FOLDER ? undefined : values.folderId || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Bookmark saved";
      toast.message = bookmark.title || bookmark.url;

      pop();
    } catch (error) {
      const err = toError(error);
      toast.style = Toast.Style.Failure;
      toast.title = err.message;
      const isAuthError = err.message.includes("API key") || err.message.includes("scope");
      if (isAuthError) {
        toast.primaryAction = { title: "Open Preferences", onAction: openExtensionPreferences };
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://..." autoFocus />
      <Form.TextField id="title" title="Title" placeholder="Page title (optional)" />
      <Form.TextField id="description" title="Description" placeholder="Short description (optional)" />
      <Form.TextArea id="note" title="Note" placeholder="Personal note (optional)" />
      <Form.Separator />
      <Form.Dropdown id="folderId" title="Folder" defaultValue={NO_FOLDER}>
        <Form.Dropdown.Item title="No folder (Unsorted)" value={NO_FOLDER} />
        {sidebar?.folders.map((f: Folder) => (
          <Form.Dropdown.Item key={f.id} title={`${f.name} (${f._count?.bookmarks ?? 0})`} value={f.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagIds" title="Tags" defaultValue={[]}>
        {sidebar?.tags.map((t: Tag) => (
          <Form.TagPicker.Item key={t.id} title={t.name} value={t.id} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="newTagName" title="Create New Tag" placeholder="Type a new tag name to create it on save" />
    </Form>
  );
}
