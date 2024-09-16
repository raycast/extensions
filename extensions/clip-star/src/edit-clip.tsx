import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Clip } from "./types";
import { updateClip } from "./utils/storage";
import { getLocalizedStrings } from "./utils/i18n";

export function EditClipForm({ clip, onEdit }: { clip: Clip; onEdit: (updatedClip: Clip) => void }) {
  const [title, setTitle] = useState(clip.title);
  const [url, setUrl] = useState(clip.url);
  const [tags, setTags] = useState(clip.tags.join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const strings = getLocalizedStrings();

  async function handleSubmit() {
    try {
      setIsLoading(true);
      const updatedClip: Clip = {
        ...clip,
        title,
        url,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== ""),
        updatedAt: new Date().toISOString(),
      };
      await updateClip(updatedClip);
      showToast(Toast.Style.Success, strings.clipUpdated);
      onEdit(updatedClip);
      pop();
    } catch (error) {
      showToast(Toast.Style.Failure, strings.failedToUpdateClip);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={strings.edit}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.updateClip} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title={strings.title} value={title} onChange={setTitle} />
      <Form.TextField id="url" title={strings.url} value={url} onChange={setUrl} />
      <Form.TextField
        id="tags"
        title={strings.tags}
        value={tags}
        onChange={setTags}
        placeholder={strings.separateTagsWithComma}
      />
    </Form>
  );
}

export function editClip(clip: Clip): Promise<Clip | null> {
  return new Promise((resolve) => {
    const strings = getLocalizedStrings();
    showToast(Toast.Style.Animated, strings.editingClip);
    <EditClipForm
      clip={clip}
      onEdit={(updatedClip) => {
        resolve(updatedClip);
      }}
    />;
  });
}
