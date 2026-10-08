import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, getHeaders, generateSlug, extractError } from "./api";
import { categorySchema } from "./schemas";

export default function Command() {
  const { pop } = useNavigation();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slug, setSlug] = useState("");

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating category..." });
      const response = await fetch(`${BASE_URL}/categories`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(categorySchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to create category"));
      }
      await showToast({ style: Toast.Style.Success, title: "Category created" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create category" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Category" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Technology"
        onChange={(value) => {
          if (!slugManuallyEdited) {
            setSlug(generateSlug(value));
          }
        }}
      />
      <Form.TextField
        id="slug"
        title="Slug"
        placeholder="technology"
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugManuallyEdited(true);
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="Category description..." />
    </Form>
  );
}
