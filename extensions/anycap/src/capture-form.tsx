import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { callTool, parseFolders } from "./anycap";
import { captureArguments, CaptureValues, submitCapture } from "./capture-input";

export default function CaptureForm() {
  const [type, setType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [inputError, setInputError] = useState<string>();
  const {
    data: folders,
    isLoading,
    error,
  } = useCachedPromise(async () => parseFolders(await callTool("categories", {})), []);
  async function onSubmit(values: CaptureValues) {
    try {
      captureArguments(values);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : String(error));
      return;
    }
    setSaving(true);
    try {
      await submitCapture(values);
      await showToast({ style: Toast.Style.Success, title: "Saved to Anycap" });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Form
      isLoading={isLoading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Anycap" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        defaultValue="note"
        onChange={(value) => {
          setType(value);
          setInputError(undefined);
        }}
      >
        <Form.Dropdown.Item value="note" title="Note" />
        <Form.Dropdown.Item value="link" title="Link" />
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Optional title" />
      {type === "link" ? (
        <Form.TextField
          id="url"
          title="Link"
          placeholder="https://example.com"
          error={inputError}
          onChange={() => setInputError(undefined)}
        />
      ) : (
        <Form.TextArea
          id="body"
          title="Body"
          placeholder="Write a note"
          error={inputError}
          onChange={() => setInputError(undefined)}
        />
      )}
      <Form.Dropdown id="folder" title="Folder" defaultValue="Inbox">
        <Form.Dropdown.Item value="Inbox" title="Inbox" />
        {(folders ?? [])
          .filter((folder) => folder.name !== "Inbox")
          .map((folder) => (
            <Form.Dropdown.Item key={folder.name} value={folder.name} title={folder.name} />
          ))}
      </Form.Dropdown>
      <Form.TextField id="tags" title="Tags" placeholder="reading, design" />
      {error ? (
        <Form.Description title="Folders" text="Folders could not be loaded. You can still save to Inbox." />
      ) : null}
    </Form>
  );
}
