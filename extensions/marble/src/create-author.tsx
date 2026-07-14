import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, getHeaders, generateSlug, extractError } from "./api";
import { authorSchema } from "./schemas";

export default function Command() {
  const { pop } = useNavigation();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slug, setSlug] = useState("");

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating author..." });
      const response = await fetch(`${BASE_URL}/authors`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(authorSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to create author"));
      }
      await showToast({ style: Toast.Style.Success, title: "Author created" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create author" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Author" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="John Doe"
        onChange={(value) => {
          if (!slugManuallyEdited) {
            setSlug(generateSlug(value));
          }
        }}
      />
      <Form.TextField
        id="slug"
        title="Slug"
        placeholder="john-doe"
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugManuallyEdited(true);
        }}
      />
      <Form.TextArea id="bio" title="Bio" placeholder="A short bio..." />
      <Form.TextField id="role" title="Role" placeholder="Software Engineer" />
      <Form.TextField id="email" title="Email" placeholder="john@example.com" />
      <Form.TextField id="image" title="Image URL" placeholder="https://example.com/avatar.png" />
    </Form>
  );
}
