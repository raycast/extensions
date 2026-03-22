import { Action, ActionPanel, Form, openExtensionPreferences, showToast, Toast, useNavigation } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { KeeplyApi } from './lib/api';
import { isValidUrl } from './lib/utils';

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
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: error.message,
        primaryAction:
          error.message.includes('API key') || error.message.includes('scope')
            ? { title: 'Open Preferences', onAction: openExtensionPreferences }
            : undefined,
      });
    },
  });

  async function handleSubmit(values: FormValues) {
    if (!isValidUrl(values.url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid URL',
        message: 'Must start with http:// or https://',
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: 'Saving bookmark...' });

    try {
      let extraTagId: string | undefined;

      if (values.newTagName.trim()) {
        const normalizedName = values.newTagName.trim().toLowerCase();
        try {
          const newTag = await api.createTag(normalizedName);
          extraTagId = newTag.id;
        } catch (error) {
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('already exists') && sidebar) {
            const existing = sidebar.tags.find((t) => t.name.toLowerCase() === normalizedName);
            if (existing) extraTagId = existing.id;
          } else {
            throw error;
          }
        }
      }

      const tagIds = extraTagId ? [...values.tagIds, extraTagId] : values.tagIds;

      const bookmark = await api.createBookmark({
        url: values.url,
        title: values.title || undefined,
        description: values.description || undefined,
        note: values.note || undefined,
        folderId: values.folderId || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = 'Bookmark saved';
      toast.message = bookmark.title || bookmark.url;

      pop();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.style = Toast.Style.Failure;
      toast.title = err.message;
      toast.primaryAction =
        err.message.includes('API key') || err.message.includes('scope')
          ? { title: 'Open Preferences', onAction: openExtensionPreferences }
          : undefined;
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
      <Form.Dropdown id="folderId" title="Folder" defaultValue="">
        <Form.Dropdown.Item title="No folder (Unsorted)" value="" />
        {sidebar?.folders.map((f) => (
          <Form.Dropdown.Item key={f.id} title={`${f.name} (${f._count?.bookmarks ?? 0})`} value={f.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagIds" title="Tags" defaultValue={[]}>
        {sidebar?.tags.map((t) => (
          <Form.TagPicker.Item key={t.id} title={t.name} value={t.id} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="newTagName" title="Create New Tag" placeholder="Type a new tag name to create it on save" />
    </Form>
  );
}
