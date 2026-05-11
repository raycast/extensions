import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, getHeaders, generateSlug, extractError } from "./api";
import { tagSchema } from "./schemas";

export default function Command() {
  const { pop } = useNavigation();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slug, setSlug] = useState("");

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating tag..." });
      const response = await fetch(`${BASE_URL}/tags`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(tagSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to create tag"));
      }
      await showToast({ style: Toast.Style.Success, title: "Tag created" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create tag" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="JavaScript"
        onChange={(value) => {
          if (!slugManuallyEdited) {
            setSlug(generateSlug(value));
          }
        }}
      />
      <Form.TextField
        id="slug"
        title="Slug"
        placeholder="javascript"
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugManuallyEdited(true);
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="Tag description..." />
    </Form>
  );
}
