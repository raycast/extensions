import { Action, ActionPanel, Form, type LaunchProps, popToRoot } from "@raycast/api";
import { useRef, useState } from "react";
import { validatedTags, validatedUrl } from "./api/client";
import { saveWithFeedback } from "./save-feedback";
import { ConnectionActions } from "./components/connection-actions";

export default function SaveUrl(props: LaunchProps<{ arguments: Arguments.SaveUrl }>) {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string>();
  const [tagsError, setTagsError] = useState<string>();

  async function submit(values: { url: string; tags: string }) {
    if (pending.current) return;
    let url: string;
    try {
      url = validatedUrl(values.url);
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Enter a web URL.");
      return;
    }
    let tags: string[];
    try {
      tags = validatedTags(
        values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      );
    } catch (error) {
      setTagsError(error instanceof Error ? error.message : "Check your tags.");
      return;
    }
    pending.current = true;
    setSubmitting(true);
    try {
      if (await saveWithFeedback(() => url, tags.length ? tags : undefined)) await popToRoot();
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Pond" onSubmit={submit} />
          <ConnectionActions />
        </ActionPanel>
      }
    >
      <Form.Description text="Queue a web page for archiving in your active Pond library." />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        defaultValue={props.arguments.url}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="design, inspiration"
        info="Optional tags, separated by commas."
        error={tagsError}
        onChange={() => setTagsError(undefined)}
      />
    </Form>
  );
}
