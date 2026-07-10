import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { saveToCl1p } from "./lib/cl1p";

interface FormValues {
  title: string;
  content: string;
}

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }
    if (!values.content) {
      setContentError("Content is required");
      return;
    }

    const { apiToken } = getPreferenceValues<Preferences>();

    await showToast({ style: Toast.Style.Animated, title: "Saving..." });

    try {
      const result = await saveToCl1p(values.title, values.content, apiToken);
      if (!result.ok) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Save failed",
          message: result.message,
        });
        return;
      }

      await Clipboard.copy(result.url);
      await showHUD(
        `Saved · ${result.url} copied to clipboard\nDestroyed after first view`,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Network error",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Cl1p.net" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          "https://cl1p.net/{note name}\nLink is destroyed after it's opened once"
        }
      />
      <Form.TextField
        id="title"
        title="Note Name"
        placeholder="my-note"
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste anything you want to save"
        error={contentError}
        onChange={() => setContentError(undefined)}
      />
    </Form>
  );
}
