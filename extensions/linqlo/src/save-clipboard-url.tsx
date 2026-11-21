import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { api, getCollections } from "./api";
import { isHttpUrl } from "./client";
import { ConnectionActions } from "./connection-actions";

interface Values {
  url: string;
  title: string;
  note: string;
  collectionId: string;
}
export default function SaveClipboardUrl() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string>();
  const edited = useRef(false);
  const submitting = useRef(false);
  const {
    data: collections,
    error,
    isLoading,
    revalidate,
  } = usePromise(getCollections);
  usePromise(Clipboard.readText, [], {
    onData: (text) => {
      if (!edited.current) setUrl(text?.trim() ?? "");
    },
  });
  async function submit(values: Values) {
    if (submitting.current) return;
    const normalized = values.url.trim();
    if (!isHttpUrl(normalized)) {
      setUrlError("Enter an http or https URL.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving Bookmark",
    });
    try {
      await api("/bookmarks", {
        body: {
          url: normalized,
          ...(values.title.trim() ? { title: values.title.trim() } : {}),
          note: values.note,
          collectionId: values.collectionId || null,
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Bookmark Saved";
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Save Bookmark";
      toast.message = error instanceof Error ? error.message : "Try again.";
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <Form
      isLoading={isLoading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={submit} />
          <ConnectionActions retry={revalidate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        value={url}
        error={urlError}
        placeholder="https://example.com"
        onChange={(value) => {
          edited.current = true;
          setUrl(value);
          setUrlError(undefined);
        }}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Use the page title"
      />
      <Form.Dropdown id="collectionId" title="Collection">
        <Form.Dropdown.Item value="" title="Unsorted" />
        {collections?.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            value={collection.id}
            title={collection.title}
          />
        ))}
      </Form.Dropdown>
      {error && <Form.Description title="Connection" text={error.message} />}
      <Form.TextArea id="note" title="Note" />
    </Form>
  );
}
