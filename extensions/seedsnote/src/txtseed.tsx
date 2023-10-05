import { Action, ActionPanel, Form, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import got from "got";

interface Preferences {
  endpoint: string;
}

export default function Command() {
  const [content, setContent] = useState<string>("");
  const [contentError, setContentError] = useState<string | undefined>();
  const preferences = getPreferenceValues<Preferences>();

  function onContentChange(content: string) {
    setContent(content);
    if (content.trim().length) {
      setContentError(undefined);
    }
  }
  async function handleSubmit(values: { content: "" }) {
    setContentError(undefined);
    if (values.content.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Note content is required",
      });
      setContentError("Note content is required");
      return false;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Taking note...",
    });
    try {
      const options = {
        method: "POST",
        json: {
          content: values.content,
        },
      } as const;

      await got(preferences.endpoint, options);
      setContent("");
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "A giant tree grow from a little seed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed saving note";
      toast.message = String(err);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Seed"
        info="Markdown is supported"
        placeholder="Take a note..."
        error={contentError}
        value={content}
        onChange={onContentChange}
        enableMarkdown
      />
    </Form>
  );
}
